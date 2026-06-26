@echo off
setlocal

set "PORT=3017"

title Stop VCP Neon Runtime Survivor Server

echo.
echo ==========================================
echo   Stop VCP Neon Runtime Survivor Server
echo ==========================================
echo.
echo Looking for processes listening on port %PORT%...
echo.

set "FOUND="

for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":%PORT%" ^| findstr "LISTENING"') do (
  set "FOUND=1"
  echo Stopping PID %%a ...
  taskkill /PID %%a /F
)

if not defined FOUND (
  echo No server process was found on port %PORT%.
) else (
  echo.
  echo Server on port %PORT% has been stopped.
)

echo.
pause
endlocal