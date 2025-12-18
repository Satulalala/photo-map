@echo off
chcp 65001 >nul
cd /d "%~dp0"
title 地图相册 - 打包安装程序
set ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/

echo.
echo  ╔═══════════════════════════════════════╗
echo  ║      📦 地图相册 安装包生成器         ║
echo  ╚═══════════════════════════════════════╝
echo.

:: 检查 node_modules
if not exist "node_modules" (
    echo [1/4] 安装依赖...
    call npm install
    if errorlevel 1 (
        echo 依赖安装失败！
        pause
        exit /b 1
    )
) else (
    echo [1/4] 依赖已安装 ✓
)

:: 构建 React
echo.
echo [2/4] 构建 React 应用...
call npm run build
if not exist "build\index.html" (
    echo React 构建失败！
    pause
    exit /b 1
)
echo React 构建完成 ✓

:: 检查图标
echo.
echo [3/4] 检查资源文件...
if not exist "build\icon.ico" (
    echo 警告: 未找到 build\icon.ico，将使用默认图标
)

:: 打包
echo.
echo [4/4] 生成安装包...
call npx electron-builder --win
if errorlevel 1 (
    echo 打包失败！
    pause
    exit /b 1
)

echo.
echo  ╔═══════════════════════════════════════╗
echo  ║           ✅ 打包完成！               ║
echo  ╚═══════════════════════════════════════╝
echo.
echo  安装包位置: dist\
echo.

:: 打开输出目录
if exist "dist" (
    explorer dist
)

pause
