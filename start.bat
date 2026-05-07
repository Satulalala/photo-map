@echo off
cd /d "%~dp0"

cls
echo.
echo ========================================
echo   Photo Map - Frontend + Java Backend
echo ========================================
echo.
echo Choose startup mode:
echo.
echo [1] Web + Java Backend
echo [2] Desktop + Java Backend
echo [3] Java Backend Only
echo [0] Exit
echo.
set /p choice=Select (0-3): 

if "%choice%"=="1" goto run_web
if "%choice%"=="2" goto run_desktop
if "%choice%"=="3" goto run_backend
if "%choice%"=="0" exit

echo Invalid choice, please try again...
pause
goto :eof

:run_backend
echo Starting Java backend on :8080 ...
start "PhotoMap Java Backend" cmd /k "cd /d "%~dp0server-java" && mvn spring-boot:run"
goto :eof

:run_web
echo Starting Java backend + Web frontend...
start "PhotoMap Java Backend" cmd /k "cd /d "%~dp0server-java" && mvn spring-boot:run"
call timeout /t 2 >nul
npm run web:dev
goto :eof

:run_desktop
echo Starting Java backend + Desktop frontend...
start "PhotoMap Java Backend" cmd /k "cd /d "%~dp0server-java" && mvn spring-boot:run"
call timeout /t 2 >nul
npm run dev
goto :eof
