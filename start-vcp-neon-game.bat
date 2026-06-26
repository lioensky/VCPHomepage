@echo off
setlocal

set "PORT=3017"
set "URL=http://127.0.0.1:%PORT%/vcp-neon-game/index.html"

title VCP Neon Runtime Survivor Server

echo.
echo ==========================================
echo   VCP Neon Runtime Survivor - Local Test
echo ==========================================
echo.
echo This script starts a dedicated static server for the game only.
echo It does NOT use the Vite dev server, so it will not open the website SPA.
echo.
echo Game URL:
echo   %URL%
echo.
echo Close method:
echo   Press Ctrl+C in this window, then input Y if prompted.
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Node.js was not found.
  echo Please install Node.js, then run this script again.
  echo.
  pause
  exit /b 1
)

node scripts\serve-vcp-neon-game.cjs

echo.
echo Server stopped.
pause
endlocal