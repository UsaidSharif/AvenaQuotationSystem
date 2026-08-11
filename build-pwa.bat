@echo off
setlocal
cd /d "%~dp0"
call npm run build:pwa
if errorlevel 1 goto :error
echo.
echo Production PWA created in dist\avena-quotation-pwa\browser
pause
goto :eof
:error
echo Build failed.
pause
exit /b 1
