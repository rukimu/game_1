@echo off
setlocal
cd /d "%~dp0"

echo [git] 最新を取得します (失敗してもゲームは起動します)
git pull --ff-only
echo.

if not exist ".env" (
  echo [setup] .env が無いので .env.example をコピーします
  copy /Y ".env.example" ".env" >nul
)

if not exist "node_modules" (
  echo [setup] 依存をインストールします (初回のみ・数分かかります)
  call npm install
  if errorlevel 1 goto :error
)

if not exist "prisma\dev.db" (
  echo [setup] DB を初期化します (初回のみ)
  call npm run setup
  if errorlevel 1 goto :error
)

echo.
echo [run] http://localhost:3000 で起動します。終了は Ctrl+C
echo.
call npm run dev
goto :eof

:error
echo.
echo [error] セットアップに失敗しました
pause
exit /b 1
