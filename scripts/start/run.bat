@echo off
chcp 65001 >nul
title 地图相册 - 快速启动

:menu
cls
echo.
echo ========================================
echo         地图相册 - 快速启动菜单
echo ========================================
echo.
echo 🚀 快速测试（推荐）：
echo.
echo [1] 🌐 Web版本测试 (浏览器，支持热更新)
echo [2] 💻 桌面版测试 (Electron，完整功能)
echo.
echo 🛠️ 开发工具：
echo.
echo [3] 📦 安装依赖 (npm install)
echo [4] 🔨 构建 Web 版本
echo [5] 🔨 构建桌面版本
echo [6] 🔨 构建所有版本
echo [7] 🧪 运行测试
echo [8] ⚙️ 项目设置向导
echo [9] 🧹 清理缓存
echo [0] ❌ 退出
echo.
set /p choice=请选择操作 (0-9): 

if "%choice%"=="1" goto web_test
if "%choice%"=="2" goto desktop_test
if "%choice%"=="3" goto install
if "%choice%"=="4" goto build_web
if "%choice%"=="5" goto build_electron
if "%choice%"=="6" goto build_all
if "%choice%"=="7" goto test
if "%choice%"=="8" goto setup
if "%choice%"=="9" goto clean
if "%choice%"=="0" goto exit

echo 无效选项，请重新选择...
pause
goto menu

:web_test
echo.
echo 🌐 启动 Web 版本测试...
call run-web.bat
goto menu

:desktop_test
echo.
echo 💻 启动桌面版测试...
call run-desktop.bat
goto menu

:install
echo.
echo 正在安装依赖...
npm install
if %errorlevel% neq 0 (
    echo 安装失败！请检查网络连接和 Node.js 版本
) else (
    echo 依赖安装完成！
)
pause
goto menu

:build_electron
echo.
echo 构建 Electron 版本...
npm run build
if %errorlevel% neq 0 (
    echo 构建失败！
) else (
    echo Electron 版本构建完成！
    echo 输出目录：build/
)
pause
goto menu

:build_web
echo.
echo 构建 Web 版本...
npm run web:build
if %errorlevel% neq 0 (
    echo 构建失败！
) else (
    echo Web 版本构建完成！
    echo 输出目录：dist-web/
)
pause
goto menu

:build_all
echo.
echo 构建所有版本...
npm run build:all
if %errorlevel% neq 0 (
    echo 构建失败！
) else (
    echo 所有版本构建完成！
    echo Electron 版本：build/
    echo Web 版本：dist-web/
)
pause
goto menu

:test
echo.
echo 运行测试...
npm test
pause
goto menu

:setup
echo.
echo 启动项目设置向导...
npm run setup
pause
goto menu

:clean
echo.
echo 清理缓存和构建文件...
if exist node_modules rmdir /s /q node_modules
if exist build rmdir /s /q build
if exist dist-web rmdir /s /q dist-web
if exist dist rmdir /s /q dist
echo 清理完成！
echo 请重新运行 "安装依赖" 选项
pause
goto menu

:exit
echo.
echo 感谢使用地图相册开发工具！
echo.
pause
exit