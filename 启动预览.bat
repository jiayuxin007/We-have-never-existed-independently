@echo off
cd /d "%~dp0"
echo Starting local preview. Keep this window open.
echo Then in Chrome open:
echo   http://localhost:8080/app/index.html
echo.
python -m http.server 8080
if errorlevel 1 (
  echo.
  echo Python was not found. Install Python 3 and tick "Add Python to PATH".
  echo Or try: py -m http.server 8080
  pause
)
