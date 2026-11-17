@echo off
setlocal
cd /d "%~dp0apps\mobile"
echo ======================================================================
echo    Universal 3D Viewer - Offline 3D & CAD Application
echo ======================================================================
echo.
echo Starting local application server...
start "" http://localhost:3000
call npx vite --port 3000 --host
pause
