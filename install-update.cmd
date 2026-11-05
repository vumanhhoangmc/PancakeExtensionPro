@echo off
chcp 65001 >nul
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0updater\install.ps1"
if errorlevel 1 echo Cai dat chua hoan tat. Xem thong bao loi ben tren.
pause
