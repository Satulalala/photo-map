# 管理后台

管理后台使用 Cloudflare Worker 和 D1 实现，入口为 `/admin`。后台支持查看账号与云存储汇总、搜索账号、停用或恢复普通账号，以及查看操作审计记录。

## 首次启用

1. 先确认目标环境。生产环境使用顶层 D1 配置 `photo-map-prod`，应用迁移的命令是 `npx.cmd wrangler d1 migrations apply DB --remote --env=""`；staging 应明确使用 `--env=staging`。迁移不会自动创建管理员，也不会添加默认口令。
2. 在 PhotoMap 注册并登录一个普通账号，然后在 Cloudflare Dashboard 的 D1 Console 中确认账号 ID：

   ```sql
   SELECT id, email, role, account_status
   FROM users
   WHERE email = '你的登录邮箱';
   ```

3. 核对邮箱和 ID 后，仅将该账号提升为管理员：

   ```sql
   -- 将 123 替换为上一步核对的数字 ID
   UPDATE users
   SET role = 'admin'
   WHERE id = 123
     AND account_status = 'active'
     AND role = 'user';
   ```

4. 完成目标数据库迁移和管理员提权后，构建资源：`npm.cmd run cloudflare:build`。生产部署使用 `npx.cmd wrangler deploy --env=""`，staging 部署使用 `npx.cmd wrangler deploy --env=staging`。部署后打开 PhotoMap 网站的 `/admin` 并登录。

## 权限与账号停用

- 管理 API 每次请求都在 Worker 中校验登录状态、账号状态和管理员角色；前端路由本身不构成权限边界。
- 后台仅能停用或恢复普通账号，操作必须填写原因，并记录操作者、目标账号、状态变化和时间。
- 停用账号会递增 `auth_version`，使现有会话失效，并阻止该账号登录及访问云端 API。账号及其照片数据不会被删除。
- 后台不提供管理员提权或管理员之间的停用操作。首次管理员设置和后续角色变更需通过受控的 D1 管理操作完成。
