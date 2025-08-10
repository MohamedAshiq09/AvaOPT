@echo off
echo SubnetYield Project Test Suite
echo ==============================
echo.
echo Choose your preferred test runner:
echo 1. Node.js version (test-project.js)
echo 2. PowerShell version (test-project.ps1)
echo 3. PowerShell with Mock Mode (safer for network tests)
echo 4. PowerShell Skip Build (faster execution)
echo.
set /p choice="Enter your choice (1-4): "

if "%choice%"=="1" (
    echo Running Node.js test suite...
    node test-project.js
) else if "%choice%"=="2" (
    echo Running PowerShell test suite...
    powershell -ExecutionPolicy Bypass -File test-project.ps1
) else if "%choice%"=="3" (
    echo Running PowerShell test suite in Mock Mode...
    powershell -ExecutionPolicy Bypass -File test-project.ps1 -MockMode
) else if "%choice%"=="4" (
    echo Running PowerShell test suite (Skip Build)...
    powershell -ExecutionPolicy Bypass -File test-project.ps1 -SkipBuild
) else (
    echo Invalid choice. Running default Node.js version...
    node test-project.js
)

echo.
echo Test execution completed.
pause