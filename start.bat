@echo off
echo Starting GraphApp...

start cmd /k "cd server && node server.js"
start cmd /k "npm run dev"

echo Server and client started! 