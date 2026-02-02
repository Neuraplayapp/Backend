@echo off
echo Starting NeuraPlay Development Environment...
echo.
echo Starting Vite Dev Server...
start "Vite Dev Server" cmd /k "npm run dev"
echo.
echo Starting API Server...
start "API Server" cmd /k "node dev-server.js"
echo.
echo Development servers started!
echo Vite Dev Server: http://localhost:5173 (or next available port)
echo API Server: http://localhost:8888
echo.
echo Press any key to exit...
pause > nul 