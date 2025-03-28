@echo off
echo Starting Graph App servers...

:: Start the Express server in a new window
start cmd /k "cd %~dp0 && npm run server"

:: Wait a moment for the API server to start
timeout /t 2 > nul

:: Start the React dev server in the current window
npm run dev 