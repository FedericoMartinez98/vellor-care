@echo off
title Vellor PC Care - Agente de Telemetria
chcp 65001 > nul
cls

echo ========================================================
echo       EXECUTANDO AGENTE VELLOR PC CARE
echo ========================================================
echo.

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0vellor-agent.ps1"

echo.
echo Pressione qualquer tecla para fechar...
pause > nul
