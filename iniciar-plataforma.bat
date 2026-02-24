@echo off
title Plataforma de Cursos
echo ========================================
echo   Iniciando Plataforma de Cursos...
echo ========================================
echo.

echo [1/2] Iniciando Backend (porta 9823)...
start "Backend" cmd /k "cd /d %~dp0backend-plataforma-de-receitas\src && python app.py"

echo [2/2] Iniciando Frontend (porta 5173)...
start "Frontend" cmd /k "cd /d %~dp0frontend-plataforma-de-receitas && npm run dev"

echo.
echo ========================================
echo   Aguarde alguns segundos...
echo   O navegador vai abrir automaticamente.
echo ========================================

timeout /t 5 /nobreak >nul
start http://localhost:5173

echo.
echo Pronto! Para parar, feche as duas janelas do terminal.
echo.
pause
