@echo off
chcp 65001 >nul
title 地图相册 - Web版本测试

:: 切换到脚本所在目录的上两级（photo-map 目录）
cd /d "%~dp0..\.."

echo.
echo ========================================
echo        地图相册 - Web版本测试
echo ========================================
echo.
echo 🌐 启动 Web 版本开发服务器...
echo 📱 支持热更新，修改代码立即生效
echo 🔗 访问地址: http://localhost:3001
echo.

:: 检查依赖
if not exist "node_modules" (
    echo 📦 首次运行，正在安装依赖...
    npm install
    if %errorlevel% neq 0 (
        echo ❌ 依赖安装失败！
        pause
        exit /b 1
    )
)

:: 启动 Web 开发服务器
echo ✅ 启动 Web 版本...
echo.
echo 💡 提示：
echo   - 修改代码后自动刷新
echo   - 按 Ctrl+C 停止服务器
echo   - 浏览器会自动打开 http://localhost:3001
echo.

start "" "http://localhost:3001/index-web.html"
npm run web:dev

pause