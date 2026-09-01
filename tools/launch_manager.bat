@echo off
cd /d "%~dp0"
where python >nul 2>nul
if not errorlevel 1 (
  python works_manager.py
  goto :done
)
where py >nul 2>nul
if not errorlevel 1 (
  py works_manager.py
  goto :done
)
set "CODEX_PYTHON=%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe"
if exist "%CODEX_PYTHON%" (
  "%CODEX_PYTHON%" works_manager.py
  goto :done
)
echo Python 3 not found. Please install Python and Pillow first.
echo python -m pip install Pillow
:done
if errorlevel 1 pause
