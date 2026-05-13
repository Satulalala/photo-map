@echo off
cd /d "%~dp0"

:menu
cls
echo.
echo  ========================================
echo          Photo Map - Launcher
echo  ========================================
echo.
echo    [1] Docker Deploy
echo    [2] Web Dev
echo    [3] Desktop Dev
echo    [4] Backend Only
echo    [0] Exit
echo.
echo  ========================================
echo.
set /p choice=  Select (0-4):

if "%choice%"=="1" goto docker
if "%choice%"=="2" goto web
if "%choice%"=="3" goto desktop
if "%choice%"=="4" goto backend
if "%choice%"=="0" exit

echo.
echo  Invalid choice
timeout /t 2 >nul
goto menu

:docker
cls
echo.
echo  [Docker Deploy]
echo  ----------------------------------------
echo  Building and starting containers...
echo.
docker-compose up --build -d
if %errorlevel% neq 0 (
    echo.
    echo  Failed! Make sure Docker Desktop is running.
    echo.
    pause
    goto menu
)
echo.
echo  Success! Visit http://localhost
echo.
echo  ----------------------------------------
echo    [1] View logs
echo    [2] Stop containers
echo    [0] Back to menu
echo  ----------------------------------------
echo.
set /p action=  Select:
if "%action%"=="1" (
    docker-compose logs -f
    pause
    goto docker
)
if "%action%"=="2" (
    docker-compose down
    echo.
    echo  Containers stopped.
    pause
    goto menu
)
goto menu

:web
cls
echo.
echo  [Web Dev]
echo  ----------------------------------------
echo  Starting backend on port 8080...
start "PhotoMap Backend" cmd /k "cd /d "%~dp0..\server-java" && mvn spring-boot:run"
echo  Waiting for backend...
timeout /t 3 >nul
echo  Starting frontend on port 3001...
echo.
cd /d "%~dp0.."
npm run web:dev
goto menu

:desktop
cls
echo.
echo  [Desktop Dev]
echo  ----------------------------------------
echo  Starting backend on port 8080...
start "PhotoMap Backend" cmd /k "cd /d "%~dp0..\server-java" && mvn spring-boot:run"
echo  Waiting for backend...
timeout /t 3 >nul
echo  Starting Electron...
echo.
cd /d "%~dp0.."
npm run dev
goto menu

:backend
cls
echo.
echo  [Backend Only]
echo  ----------------------------------------
echo  Starting backend on port 8080...
echo.
cd /d "%~dp0..\server-java"
mvn spring-boot:run
goto menu
