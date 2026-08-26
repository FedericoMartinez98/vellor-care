import { NextRequest, NextResponse } from 'next/server'

const AGENT_API_KEY = process.env.VELLOR_AGENT_KEY

export async function POST(req: NextRequest) {
  try {
    if (!AGENT_API_KEY) {
      return NextResponse.json(
        { error: 'Servidor mal configurado: VELLOR_AGENT_KEY nao definido.' },
        { status: 500 }
      )
    }

    const apiKeyHeader = req.headers.get('X-Agent-Api-Key')

    // 1. Validação de Segurança Criptográfica da Chave
    if (!apiKeyHeader || apiKeyHeader !== AGENT_API_KEY) {
      return NextResponse.json(
        { error: 'Não autorizado. Chave de API inválida ou ausente.' },
        { status: 401 }
      )
    }

    const body = await req.json()

    if (!body.hostname && !body.assetTag) {
      return NextResponse.json(
        { error: 'Hostname ou AssetTag é obrigatório.' },
        { status: 400 }
      )
    }

    // 2. Log de telemetria recebida na Vercel
    console.log(`[Vellor Telemetry] Recebida telemetria de ${body.hostname} (${body.assetTag})`)
    console.log(`[Vellor Telemetry] SSD: ${body.ssdHealthPercent}% | CPU: ${body.cpuUsagePercent}% (${body.cpuTempC}°C) | RAM: ${body.ramUsagePercent}%`)

    return NextResponse.json(
      {
        status: 'SUCCESS',
        message: 'Telemetria do equipamento recebida com sucesso na Vercel.',
        receivedAt: new Date().toISOString(),
        device: {
          assetTag: body.assetTag,
          hostname: body.hostname,
          ssdHealth: body.ssdHealthPercent,
          cpuTemp: body.cpuTempC,
          windowsVersion: body.windowsVersion,
        },
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('[Vellor Telemetry] Erro ao processar telemetria', error)
    return NextResponse.json(
      { error: 'Erro interno ao processar telemetria' },
      { status: 500 }
    )
  }
}
