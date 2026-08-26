@echo off
title Vellor PC Care - Coletor de Telemetria
chcp 65001 > nul
cls

echo ========================================================
echo     COLETANDO TELEMETRIA DESTE COMPUTADOR (VELLOR CARE)
echo ========================================================
echo Isso gera um arquivo .csv na Area de Trabalho.
echo Depois, suba esse arquivo manualmente no site do Vellor Care.
echo.

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0vellor-agent.ps1"

echo.
echo Pressione qualquer tecla para fechar...
pause > nul
