@echo off
setlocal
cd /d "%~dp0"
echo Installing dependencies...
call npm install
if errorlevel 1 goto :error
echo Starting Avena Quotation System...
call npm start
goto :eof
:error
echo.
echo Installation failed. Use Node.js 22.22.3+, 24.15.0+, or a compatible Node 26 release.
pause
exit /b 1
