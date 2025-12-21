@echo off
chcp 65001 >nul
title 地图相册 - 桌面版测试

echo.
echo ========================================
echo       地图相册 - 桌面版测试
echo ========================================
echo.
echo 💻 启动 Electron 桌面版...
echo 🚀 完整功能，本地存储
echo 📁 数据存储在本地文件系统
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

:: 检查是否需要重建原生模块
echo 🔧 检查原生模块...
npm run rebuild >nul 2>&1

:: 启动 Electron 应用
echo ✅ 启动桌面版应用...
echo.
echo 💡 提示：
echo   - 应用窗口将自动打开
echo   - 支持热重载开发
echo   - 按 Ctrl+C 停止开发服务器
echo.

npm run dev

pause