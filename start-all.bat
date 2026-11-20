@echo off
setlocal EnableDelayedExpansion
title InduTrack KE - Unified Launcher

:: =====================================================================
:: InduTrack KE - Unified Multi-Service Master Launcher
:: Combines Backend, Frontend, Queue Worker, Scheduler, and Utilities
:: =====================================================================

set "ROOT_DIR=%~dp0"
set "BACKEND_DIR=%ROOT_DIR%backend"
set "FRONTEND_DIR=%ROOT_DIR%frontend"

:: Resolve PHP Binary (WAMP or System PATH)
if exist "D:\wamp64\bin\php\php8.3.28\php.exe" (
    set "PHP_BIN=D:\wamp64\bin\php\php8.3.28\php.exe"
) else if exist "D:\wamp64\bin\php\php8.2.29\php.exe" (
    set "PHP_BIN=D:\wamp64\bin\php\php8.2.29\php.exe"
) else (
    set "PHP_BIN=php"
)

:: Resolve NPM Binary
set "NPM_BIN=npm.cmd"

:: Check CLI Arguments for Direct Subcommand Execution
if /i "%~1"=="backend"   goto :run_backend
if /i "%~1"=="frontend"  goto :run_frontend
if /i "%~1"=="queue"     goto :run_queue
if /i "%~1"=="scheduler" goto :run_scheduler
if /i "%~1"=="migrate"   goto :run_migrate
if /i "%~1"=="core"      goto :launch_core
if /i "%~1"=="all"       goto :launch_all
if /i "%~1"=="build"     goto :run_build

:: -------------------------------------------------------------
:: Main Interactive Menu
:: -------------------------------------------------------------
:menu
cls
echo =====================================================================
echo    InduTrack KE - All-in-One Control Center
echo =====================================================================
echo.
echo  Root Directory: %ROOT_DIR%
echo  PHP Binary:     %PHP_BIN%
echo.
echo ---------------------------------------------------------------------
echo  SELECT AN OPTION:
echo ---------------------------------------------------------------------
echo   [1] Start Core Services (Backend API + Frontend App)
echo   [2] Start All Services  (Backend + Frontend + Queue + Scheduler)
echo.
echo   [3] Start Backend Server Only  (Laravel @ http://localhost:8000)
echo   [4] Start Frontend Server Only (React Vite @ http://localhost:5173)
echo   [5] Start Queue Worker Only    (php artisan queue:work)
echo   [6] Start Scheduler Only       (php artisan schedule:work)
echo.
echo   [7] Run Database Fresh Migration ^& Seed (php artisan migrate:fresh --seed)
echo   [8] Build Frontend for Production       (npm run build)
echo.
echo   [0] Exit
echo ---------------------------------------------------------------------
set "choice="
set /p choice="Enter option [1-8, 0] (Default is 1): "

if "%choice%"=="" set choice=1
if "%choice%"=="1" goto :launch_core
if "%choice%"=="2" goto :launch_all
if "%choice%"=="3" goto :launch_backend_win
if "%choice%"=="4" goto :launch_frontend_win
if "%choice%"=="5" goto :launch_queue_win
if "%choice%"=="6" goto :launch_scheduler_win
if "%choice%"=="7" goto :run_migrate
if "%choice%"=="8" goto :run_build
if "%choice%"=="0" goto :exit_script

echo.
echo [!] Invalid selection '%choice%'. Please try again.
timeout /t 2 >nul
goto :menu


:: -------------------------------------------------------------
:: Launcher Routines (opens separate Windows)
:: -------------------------------------------------------------
:launch_core
echo.
echo [*] Launching Core Services (Backend + Frontend)...
start "InduTrack KE - Backend Server" cmd /k ""%~f0" backend"
start "InduTrack KE - Frontend Server" cmd /k ""%~f0" frontend"
echo [OK] Backend and Frontend launched in dedicated windows.
goto :after_launch

:launch_all
echo.
echo [*] Launching All 4 Services (Backend, Frontend, Queue, Scheduler)...
start "InduTrack KE - Backend Server" cmd /k ""%~f0" backend"
start "InduTrack KE - Frontend Server" cmd /k ""%~f0" frontend"
start "InduTrack KE - Queue Worker" cmd /k ""%~f0" queue"
start "InduTrack KE - Scheduler" cmd /k ""%~f0" scheduler"
echo [OK] All services launched in dedicated windows.
goto :after_launch

:launch_backend_win
start "InduTrack KE - Backend Server" cmd /k ""%~f0" backend"
goto :after_launch

:launch_frontend_win
start "InduTrack KE - Frontend Server" cmd /k ""%~f0" frontend"
goto :after_launch

:launch_queue_win
start "InduTrack KE - Queue Worker" cmd /k ""%~f0" queue"
goto :after_launch

:launch_scheduler_win
start "InduTrack KE - Scheduler" cmd /k ""%~f0" scheduler"
goto :after_launch

:after_launch
echo.
echo ---------------------------------------------------------------------
echo  Backend:   http://localhost:8000
echo  Frontend:  http://localhost:5173
echo ---------------------------------------------------------------------
echo.
if not "%~1"=="" exit /b 0
pause
goto :menu


:: -------------------------------------------------------------
:: Direct Service Execution Handlers
:: -------------------------------------------------------------
:run_backend
title InduTrack KE - Backend Server [Port 8000]
echo =====================================================================
echo    InduTrack KE - Laravel Backend Server
echo =====================================================================
echo Directory: %BACKEND_DIR%
echo URL:       http://localhost:8000
echo.
cd /d "%BACKEND_DIR%"
"%PHP_BIN%" artisan serve --host=127.0.0.1 --port=8000
echo.
echo [*] Backend server process terminated.
pause
exit /b 0

:run_frontend
title InduTrack KE - Frontend Dev Server [Port 5173]
echo =====================================================================
echo    InduTrack KE - React Vite Frontend Server
echo =====================================================================
echo Directory: %FRONTEND_DIR%
echo URL:       http://localhost:5173
echo.
cd /d "%FRONTEND_DIR%"
call %NPM_BIN% run dev
echo.
echo [*] Frontend server process terminated.
pause
exit /b 0

:run_queue
title InduTrack KE - Queue Worker
echo =====================================================================
echo    InduTrack KE - Background Queue Worker
echo =====================================================================
echo Directory: %BACKEND_DIR%
echo Command:   artisan queue:work --tries=3
echo.
cd /d "%BACKEND_DIR%"
"%PHP_BIN%" artisan queue:work --tries=3
echo.
echo [*] Queue worker terminated.
pause
exit /b 0

:run_scheduler
title InduTrack KE - Schedule Worker
echo =====================================================================
echo    InduTrack KE - Scheduled Tasks Worker
echo =====================================================================
echo Directory: %BACKEND_DIR%
echo Command:   artisan schedule:work
echo.
cd /d "%BACKEND_DIR%"
"%PHP_BIN%" artisan schedule:work
echo.
echo [*] Scheduler worker terminated.
pause
exit /b 0

:run_migrate
title InduTrack KE - Database Migration ^& Seed
echo =====================================================================
echo    InduTrack KE - Database Migration and Seeder
echo =====================================================================
echo.
if "%~1"=="" (
    echo [!] WARNING: This will drop existing tables and re-seed sample data.
    set /p confirm="Are you sure you want to proceed? (y/N): "
    if /i not "!confirm!"=="y" (
        echo [*] Operation cancelled.
        timeout /t 2 >nul
        goto :menu
    )
)
echo.
cd /d "%BACKEND_DIR%"
"%PHP_BIN%" artisan migrate:fresh --seed
echo.
echo [OK] Migration and seeding complete.
if not "%~1"=="" exit /b 0
pause
goto :menu

:run_build
title InduTrack KE - Frontend Production Build
echo =====================================================================
echo    InduTrack KE - Frontend Production Build
echo =====================================================================
echo.
cd /d "%FRONTEND_DIR%"
call %NPM_BIN% run build
echo.
echo [OK] Build process complete.
if not "%~1"=="" exit /b 0
pause
goto :menu

:exit_script
echo Exiting InduTrack KE Launcher. Goodbye!
exit /b 0
