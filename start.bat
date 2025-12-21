@echo off
chcp 65001 >nul
title 地图相册 - 快速启动

:: 切换到脚本所在目录（photo-map 目录）
cd /d "%~dp0"

cls
echo.
echo ========================================
echo         🗺️ 地图相册 - 快速启动
echo ========================================
echo.
echo 选择要启动的版本：
echo.
echo [1] 🌐 Web版本 (浏览器测试，支持热更新)
echo [2] 💻 桌面版 (Electron完整功能)
echo [3] 🛠️ 开发工具菜单
echo [0] ❌ 退出
echo.
set /p choice=请选择 (0-3): 

if "%choice%"=="1" (
    echo 启动Web版本...
    call scripts\start\run-web.bat
) else if "%choice%"=="2" (
    echo 启动桌面版...
    call scripts\start\run-desktop.bat
) else if "%choice%"=="3" (
    call scripts\start\run.bat
) else if "%choice%"=="0" (
    exit
) else (
    echo 无效选择，请重试...
    pause
    goto :eof
)