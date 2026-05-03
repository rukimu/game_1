@echo off
setlocal enabledelayedexpansion
cd /d "%~dp0"

REM ============================================================
REM  pull.bat — git fetch + 指定ブランチで fast-forward pull.
REM
REM  使い方:
REM    pull.bat                 現在のブランチを pull
REM    pull.bat <branch-name>   指定ブランチに切替えて pull
REM
REM  例:
REM    pull.bat claude/check-dev-status-Pmp0l
REM ============================================================

set "BRANCH=%~1"

echo [git] origin から fetch します...
git fetch origin
if errorlevel 1 (
  echo.
  echo [error] fetch に失敗しました。ネットワークか origin の設定を確認してください。
  pause
  exit /b 1
)

if "%BRANCH%"=="" (
  REM 引数なし: 現在のブランチを使う
  for /f "delims=" %%b in ('git rev-parse --abbrev-ref HEAD') do set "BRANCH=%%b"
  echo [info] 現在のブランチ "!BRANCH!" を pull します。
) else (
  REM 引数あり: 指定ブランチに切替
  echo [info] ブランチ "%BRANCH%" に切替えます...

  REM ローカルに同名ブランチがあれば checkout、なければ origin から作成
  git rev-parse --verify "%BRANCH%" >nul 2>&1
  if errorlevel 1 (
    echo [info] ローカルにブランチ "%BRANCH%" がないので origin から作成します。
    git checkout -b "%BRANCH%" "origin/%BRANCH%"
  ) else (
    git checkout "%BRANCH%"
  )
  if errorlevel 1 (
    echo.
    echo [error] checkout に失敗しました。ローカル変更が残っていないか確認してください。
    pause
    exit /b 1
  )
)

echo [git] origin/%BRANCH% から fast-forward pull します...
git pull --ff-only origin "%BRANCH%"
if errorlevel 1 (
  echo.
  echo [error] pull に失敗しました。ローカル変更が残っていないか、リモートに非互換コミットがないか確認してください。
  pause
  exit /b 1
)

echo.
echo [ok] %BRANCH% の最新を取得しました。
pause
