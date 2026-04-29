@echo off
setlocal
cd /d "%~dp0"

echo [git] origin から pull します...
git pull --ff-only
if errorlevel 1 (
  echo.
  echo [error] pull に失敗しました。ローカル変更が残っていないか確認してください。
  pause
  exit /b 1
)

echo.
echo [ok] 最新を取得しました。
pause
