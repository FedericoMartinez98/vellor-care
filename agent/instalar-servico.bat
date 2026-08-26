@echo off
title Instalar Agente Vellor PC Care no Windows
chcp 65001 > nul
cls

echo ========================================================
echo   INSTALADOR DE TELEMETRIA AUTOMATICA - VELLOR PC CARE
echo ========================================================
echo.
echo Configurando tarefa agendada no Windows para executar a cada 1 hora...
echo.

set SCRIPT_PATH=%~dp0vellor-agent.ps1

schtasks /create /tn "VellorCareTelemetryAgent" /tr "powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File \"%SCRIPT_PATH%\"" /sc hourly /mo 1 /f

echo.
if %errorlevel% equ 0 (
    echo [OK] Agente instalado com sucesso no Agendador de Tarefas do Windows!
    echo Ele rodara silenciosamente em segundo plano a cada 1 hora.
) else (
    echo [ERRO] Execute este arquivo como Administrador (Botao direito -> Executar como Administrador).
)

echo.
pause
