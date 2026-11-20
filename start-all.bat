@echo off
setlocal EnableDelayedExpansion
title InduTrack KE - Unified Launcher

:: =====================================================================
:: InduTrack KE - Unified Multi-Service Master Launcher
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

:: -----------------------------------------------------------------------
:: Each service window runs its command INLINE via cmd /k so this script
:: does NOT need to re-invoke itself with a label argument. This avoids the
:: "batch label not found" error that occurs when cmd restarts the script
:: with setlocal and cannot locate labels defined after the first goto chain.
:: -----------------------------------------------------------------------

:: CLI shortcut arguments (used by other tools, not by child windows)
if /i "%~1"=="migrate"   goto :run_migrate
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
:: Launcher Routines - open dedicated windows with INLINE commands
:: -------------------------------------------------------------
:launch_core
echo.
echo [*] Launching Core Services (Backend + Frontend)...
start "InduTrack KE - Backend Server"   cmd /k "title InduTrack KE - Backend Server && cd /d "%BACKEND_DIR%" && echo. && echo  Laravel Backend - http://localhost:8000 && echo. && "%PHP_BIN%" artisan serve --host=127.0.0.1 --port=8000"
start "InduTrack KE - Frontend Server"  cmd /k "title InduTrack KE - Frontend Server && cd /d "%FRONTEND_DIR%" && echo. && echo  Vite Frontend - http://localhost:5173 && echo. && npm.cmd run dev"
echo [OK] Backend and Frontend launched in dedicated windows.
goto :after_launch

:launch_all
echo.
echo [*] Launching All 4 Services (Backend, Frontend, Queue, Scheduler)...
start "InduTrack KE - Backend Server"   cmd /k "title InduTrack KE - Backend Server && cd /d "%BACKEND_DIR%" && echo. && echo  Laravel Backend - http://localhost:8000 && echo. && "%PHP_BIN%" artisan serve --host=127.0.0.1 --port=8000"
start "InduTrack KE - Frontend Server"  cmd /k "title InduTrack KE - Frontend Server && cd /d "%FRONTEND_DIR%" && echo. && echo  Vite Frontend - http://localhost:5173 && echo. && npm.cmd run dev"
start "InduTrack KE - Queue Worker"     cmd /k "title InduTrack KE - Queue Worker && cd /d "%BACKEND_DIR%" && echo. && echo  Queue Worker - artisan queue:work --tries=3 && echo. && "%PHP_BIN%" artisan queue:work --tries=3"
start "InduTrack KE - Scheduler"        cmd /k "title InduTrack KE - Scheduler && cd /d "%BACKEND_DIR%" && echo. && echo  Scheduler - artisan schedule:work && echo. && "%PHP_BIN%" artisan schedule:work"
echo [OK] All services launched in dedicated windows.
goto :after_launch

:launch_backend_win
start "InduTrack KE - Backend Server"   cmd /k "title InduTrack KE - Backend Server && cd /d "%BACKEND_DIR%" && echo. && echo  Laravel Backend - http://localhost:8000 && echo. && "%PHP_BIN%" artisan serve --host=127.0.0.1 --port=8000"
goto :after_launch

:launch_frontend_win
start "InduTrack KE - Frontend Server"  cmd /k "title InduTrack KE - Frontend Server && cd /d "%FRONTEND_DIR%" && echo. && echo  Vite Frontend - http://localhost:5173 && echo. && npm.cmd run dev"
goto :after_launch

:launch_queue_win
start "InduTrack KE - Queue Worker"     cmd /k "title InduTrack KE - Queue Worker && cd /d "%BACKEND_DIR%" && echo. && echo  Queue Worker - artisan queue:work --tries=3 && echo. && "%PHP_BIN%" artisan queue:work --tries=3"
goto :after_launch

:launch_scheduler_win
start "InduTrack KE - Scheduler"        cmd /k "title InduTrack KE - Scheduler && cd /d "%BACKEND_DIR%" && echo. && echo  Scheduler - artisan schedule:work && echo. && "%PHP_BIN%" artisan schedule:work"
goto :after_launch

:after_launch
echo.
echo ---------------------------------------------------------------------
echo  Backend:   http://localhost:8000
echo  Frontend:  http://localhost:5173
echo ---------------------------------------------------------------------
echo.
pause
goto :menu


:: -------------------------------------------------------------
:: Utility Handlers (run inline in this window)
:: -------------------------------------------------------------
:run_migrate
title InduTrack KE - Database Migration ^& Seed
echo =====================================================================
echo    InduTrack KE - Database Migration and Seeder
echo =====================================================================
echo.
echo [!] WARNING: This will drop ALL existing data and re-seed sample data.
set "confirm="
set /p confirm="Proceed? (y/N): "
if /i not "%confirm%"=="y" (
    echo [*] Cancelled.
    timeout /t 2 >nul
    goto :menu
)
echo.
cd /d "%BACKEND_DIR%"
"%PHP_BIN%" artisan migrate:fresh --seed
echo.
echo [OK] Migration and seeding complete.
pause
goto :menu

:run_build
title InduTrack KE - Frontend Production Build
echo =====================================================================
echo    InduTrack KE - Frontend Production Build
echo =====================================================================
echo.
cd /d "%FRONTEND_DIR%"
call npm.cmd run build
echo.
echo [OK] Build complete.
pause
goto :menu

:exit_script
echo Exiting InduTrack KE Launcher. Goodbye!
exit /b 0
