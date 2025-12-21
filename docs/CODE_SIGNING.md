# 代码签名配置指南

本文档介绍如何为地图相册应用配置代码签名，以便在 Windows 和 macOS 上发布正式版本。

## 为什么需要代码签名？

1. **Windows**: 未签名的应用会触发 SmartScreen 警告，用户体验差
2. **macOS**: 未签名的应用无法在 macOS 10.15+ 上正常运行（Gatekeeper 会阻止）
3. **自动更新**: electron-updater 需要签名才能正常工作

## Windows 代码签名

### 1. 获取代码签名证书

推荐的证书提供商：
- [DigiCert](https://www.digicert.com/) - 企业级，价格较高
- [Sectigo](https://sectigo.com/) - 性价比高
- [SSL.com](https://www.ssl.com/) - 支持个人开发者

### 2. 配置 GitHub Secrets

在 GitHub 仓库设置中添加以下 Secrets：

| Secret 名称 | 说明 |
|------------|------|
| `WIN_CSC_LINK` | Base64 编码的 .pfx 证书文件 |
| `WIN_CSC_KEY_PASSWORD` | 证书密码 |

### 3. 转换证书为 Base64

```powershell
# Windows PowerShell
[Convert]::ToBase64String([IO.File]::ReadAllBytes("certificate.pfx")) | Out-File -FilePath cert-base64.txt
```

### 4. 本地签名测试

```bash
# 设置环境变量
set CSC_LINK=path/to/certificate.pfx
set CSC_KEY_PASSWORD=your-password

# 构建并签名
npm run dist -- --win
```

## macOS 代码签名

### 1. 加入 Apple Developer Program

访问 [Apple Developer](https://developer.apple.com/programs/) 注册开发者账号（$99/年）

### 2. 创建证书

1. 登录 [Apple Developer Portal](https://developer.apple.com/account)
2. 进入 Certificates, Identifiers & Profiles
3. 创建以下证书：
   - **Developer ID Application** - 用于签名应用
   - **Developer ID Installer** - 用于签名安装包

### 3. 导出证书

1. 在 Keychain Access 中找到证书
2. 右键导出为 .p12 文件
3. 设置密码

### 4. 配置 GitHub Secrets

| Secret 名称 | 说明 |
|------------|------|
| `MAC_CERTS` | Base64 编码的 .p12 证书文件 |
| `MAC_CERTS_PASSWORD` | 证书密码 |
| `APPLE_ID` | Apple ID 邮箱 |
| `APPLE_ID_PASSWORD` | App-Specific Password |
| `APPLE_TEAM_ID` | 开发者团队 ID |

### 5. 创建 App-Specific Password

1. 访问 [Apple ID 管理页面](https://appleid.apple.com/)
2. 在安全性部分生成 App-Specific Password
3. 保存密码用于 CI/CD

### 6. 转换证书为 Base64

```bash
# macOS / Linux
base64 -i certificate.p12 -o cert-base64.txt
```

### 7. 本地签名测试

```bash
# 设置环境变量
export CSC_LINK=path/to/certificate.p12
export CSC_KEY_PASSWORD=your-password
export APPLE_ID=your-apple-id@example.com
export APPLE_ID_PASSWORD=your-app-specific-password
export APPLE_TEAM_ID=your-team-id

# 构建并签名
npm run dist -- --mac
```

## 公证 (Notarization)

macOS 10.15+ 要求应用必须经过 Apple 公证。

### 自动公证配置

在 `package.json` 的 build 配置中已包含公证设置：

```json
{
  "mac": {
    "hardenedRuntime": true,
    "gatekeeperAssess": false,
    "entitlements": "build/entitlements.mac.plist",
    "entitlementsInherit": "build/entitlements.mac.plist"
  }
}
```

### 公证流程

1. electron-builder 自动提交应用到 Apple 进行公证
2. Apple 扫描应用（通常需要几分钟）
3. 公证完成后，electron-builder 自动 staple 公证票据

### 检查公证状态

```bash
# 检查应用是否已公证
spctl -a -v /path/to/App.app

# 检查 DMG 是否已公证
spctl -a -t open --context context:primary-signature /path/to/App.dmg
```

## Linux 签名

Linux 应用通常不需要代码签名，但可以使用 GPG 签名：

```bash
# 生成 GPG 密钥
gpg --full-generate-key

# 签名 AppImage
gpg --detach-sign --armor photo-map.AppImage
```

## 故障排除

### Windows 签名失败

1. 检查证书是否过期
2. 确认证书密码正确
3. 检查时间戳服务器是否可用

### macOS 签名失败

1. 检查证书是否在 Keychain 中
2. 确认 Apple ID 和密码正确
3. 检查 Team ID 是否正确

### 公证失败

常见原因：
- 应用包含不安全的代码
- 缺少必要的 entitlements
- 使用了被禁止的 API

查看公证日志：
```bash
# 获取公证历史
xcrun notarytool history --apple-id your-id --password your-password --team-id your-team

# 获取详细日志
xcrun notarytool log <submission-id> --apple-id your-id --password your-password --team-id your-team
```

## 自签名证书（仅用于测试）

### Windows 自签名

```powershell
# 创建自签名证书
New-SelfSignedCertificate -Type CodeSigningCert -Subject "CN=Photo Map Test" -CertStoreLocation Cert:\CurrentUser\My

# 导出证书
$cert = Get-ChildItem -Path Cert:\CurrentUser\My -CodeSigningCert | Select-Object -First 1
Export-PfxCertificate -Cert $cert -FilePath test-cert.pfx -Password (ConvertTo-SecureString -String "password" -Force -AsPlainText)
```

### macOS 自签名

```bash
# 创建自签名证书
security create-keychain -p "" build.keychain
security default-keychain -s build.keychain
security unlock-keychain -p "" build.keychain

# 使用 ad-hoc 签名（仅用于本地测试）
codesign --force --deep --sign - /path/to/App.app
```

## 参考资源

- [electron-builder 代码签名文档](https://www.electron.build/code-signing)
- [Apple 代码签名指南](https://developer.apple.com/library/archive/documentation/Security/Conceptual/CodeSigningGuide/)
- [Microsoft 代码签名](https://docs.microsoft.com/en-us/windows/win32/seccrypto/cryptography-tools)

---

最后更新: 2024-12-21