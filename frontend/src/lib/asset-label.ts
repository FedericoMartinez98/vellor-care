/**
 * Vellor Care — QR Code patrimonial e etiquetas Zebra/ZPL.
 *
 * Este módulo concentra tudo que envolve a etiqueta física do equipamento:
 *  - montagem da URL da ficha (conteúdo codificado no QR Code);
 *  - geração do QR Code em data-URL (PNG) ou SVG;
 *  - geração de ZPL II para impressoras Zebra (50x30 mm, 203 ou 300 dpi);
 *  - download do arquivo .zpl no navegador;
 *  - HTML de impressão como alternativa para impressoras comuns.
 *
 * Não depende de React: pode ser usado tanto em Server Components quanto no cliente.
 */

import { toDataURL, toString as qrToString } from 'qrcode'

// ============================================================================
// URL da ficha do equipamento
// ============================================================================

/** Escolhe a primeira string preenchida da lista (ignora vazias e espaços). */
function firstFilled(...candidates: Array<string | undefined>): string | undefined {
  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim().length > 0) return candidate.trim()
  }
  return undefined
}

/** Monta a URL pública da ficha do equipamento (conteúdo do QR Code patrimonial). */
export function buildAssetUrl(computerId: string, baseUrl?: string): string {
  const envUrl = typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_APP_URL : undefined
  const originUrl = typeof window !== 'undefined' ? window.location.origin : undefined
  const base = firstFilled(baseUrl, envUrl, originUrl) ?? 'http://localhost:3000'
  const normalizedBase = base.replace(/\/+$/, '')
  return `${normalizedBase}/inventario/${encodeURIComponent(computerId)}`
}

// ============================================================================
// QR Code
// ============================================================================

/** Opções de renderização do QR Code patrimonial. */
export interface QrCodeOptions {
  /** Largura final em pixels (padrão 320). */
  size?: number
  /** Cor dos módulos escuros em hexadecimal (padrão `#0f172a`). */
  dark?: string
  /** Cor do fundo em hexadecimal (padrão `#ffffff`). */
  light?: string
}

/** Gera o QR Code como data-URL PNG, pronto para usar em `<img src>`. */
export async function generateQrDataUrl(text: string, options?: QrCodeOptions): Promise<string> {
  return toDataURL(text, {
    width: options?.size ?? 320,
    margin: 1,
    errorCorrectionLevel: 'M',
    color: {
      dark: options?.dark ?? '#0f172a',
      light: options?.light ?? '#ffffff',
    },
  })
}

/** Gera o QR Code como markup SVG (útil para impressão vetorial e PDF). */
export async function generateQrSvg(text: string, size?: number): Promise<string> {
  return qrToString(text, {
    type: 'svg',
    margin: 1,
    width: size ?? 320,
  })
}

// ============================================================================
// Etiqueta ZPL II (Zebra)
// ============================================================================

/** Dados impressos na etiqueta patrimonial de 50x30 mm. */
export interface AssetLabelData {
  assetTag: string
  hostname: string
  sector: string
  employeeName: string
  url: string
  company?: string
}

/** Opções de geração do ZPL (dimensões em dots e resolução da impressora). */
export interface ZplOptions {
  /** Largura da etiqueta em dots (`^PW`). Padrão: 400 @203dpi / 600 @300dpi. */
  widthDots?: number
  /** Altura da etiqueta em dots (`^LL`). Padrão: 240 @203dpi / 360 @300dpi. */
  heightDots?: number
  /** Resolução da impressora Zebra. Padrão 203. */
  dpi?: 203 | 300
  /**
   * Magnificação do QR Code (1 a 10). Padrão 5 @203dpi / 7 @300dpi.
   * Reduza se a URL do patrimônio for longa e o código encostar na borda.
   */
  qrMagnification?: number
}

/** Empresa exibida no topo da etiqueta quando `company` não é informado. */
const DEFAULT_COMPANY = 'Vellor Care'

/** Rodapé fixo da etiqueta patrimonial. */
const LABEL_FOOTER = 'Vellor Care - Patrimonio TI'

/** Limite de caracteres do nome do colaborador na etiqueta. */
const EMPLOYEE_MAX_CHARS = 24

/**
 * Largura (em dots @203dpi) disponível para o nome da máquina antes do QR Code,
 * que começa em x=250. Sobra 250 - 12 (margem esquerda) - 8 (respiro) = 230.
 */
const HOSTNAME_BLOCK_DOTS = 230

/**
 * Quantos caracteres cabem numa linha do nome da máquina na fonte `^A0N,20`.
 * A fonte A0 é proporcional (largura média ~0,55 da altura), então
 * 230 / (20 * 0,55) ≈ 20. Usado só para decidir se o texto vai ocupar duas
 * linhas e deslocar o que vem abaixo -- a quebra em si é feita pelo `^FB`.
 */
const HOSTNAME_CHARS_PER_LINE = 20

/**
 * Neutraliza os caracteres de controle do ZPL dentro de um campo `^FD`.
 * `^` vira espaço, `~` vira hífen e `\` vira barra; quebras de linha viram espaço.
 */
function zplEscape(value: string): string {
  return value
    .replace(/\^/g, ' ')
    .replace(/~/g, '-')
    .replace(/\\/g, '/')
    .replace(/[\r\n\t]+/g, ' ')
    .trim()
}

/** Corta o texto em `max` caracteres, sem reticências (a etiqueta é estreita). */
function truncate(value: string, max: number): string {
  return value.length > max ? value.slice(0, max) : value
}

/** Gera o ZPL II de uma etiqueta patrimonial de 50x30 mm (Zebra). */
export function buildZpl(data: AssetLabelData, opts?: ZplOptions): string {
  const dpi = opts?.dpi ?? 203
  const factor = dpi === 300 ? 1.5 : 1

  /** Converte uma medida do gabarito 203 dpi para a resolução alvo. */
  const d = (value: number): number => Math.round(value * factor)

  const printWidth = opts?.widthDots ?? d(400)
  const labelLength = opts?.heightDots ?? d(240)

  const company = zplEscape(firstFilled(data.company) ?? DEFAULT_COMPANY)
  const assetTag = zplEscape(data.assetTag)
  const hostname = zplEscape(data.hostname)
  const sector = zplEscape(data.sector)
  const employeeName = truncate(zplEscape(data.employeeName), EMPLOYEE_MAX_CHARS)
  const url = zplEscape(data.url)

  // Magnificação do QR Code: 1 a 10 conforme o manual ZPL II.
  // Arredonda para baixo ao escalar para 300 dpi (5 -> 7) para o código não
  // ultrapassar a borda direita da etiqueta.
  const qrMagnification = Math.min(
    10,
    Math.max(1, Math.floor(opts?.qrMagnification ?? 5 * factor)),
  )

  // O nome da máquina precisa sair inteiro. Sem `^FB` o ZPL não quebra linha:
  // o texto seguia reto e era cortado na borda da etiqueta (ou passava por
  // baixo do QR Code). Com o bloco, ele quebra em até 2 linhas -- e quando
  // usa a segunda, o setor e o responsável descem para não sobrepor.
  const hostnameLines = hostname.length > HOSTNAME_CHARS_PER_LINE ? 2 : 1
  const shift = (hostnameLines - 1) * 22

  return [
    '^XA',
    '^CI28',
    `^PW${printWidth}`,
    `^LL${labelLength}`,
    '^LH0,0',
    `^FO${d(12)},${d(14)}^A0N,${d(26)},${d(26)}^FD${company}^FS`,
    `^FO${d(12)},${d(46)}^GB${d(376)},${d(2)},${d(2)}^FS`,
    `^FO${d(12)},${d(58)}^A0N,${d(34)},${d(34)}^FD${assetTag}^FS`,
    `^FO${d(12)},${d(98)}^A0N,${d(20)},${d(20)}^FB${d(HOSTNAME_BLOCK_DOTS)},2,0,L^FD${hostname}^FS`,
    `^FO${d(12)},${d(124 + shift)}^A0N,${d(18)},${d(18)}^FD${sector}^FS`,
    `^FO${d(12)},${d(148 + shift)}^A0N,${d(18)},${d(18)}^FD${employeeName}^FS`,
    `^FO${d(250)},${d(58)}^BQN,2,${qrMagnification}^FDLA,${url}^FS`,
    `^FO${d(12)},${d(196)}^A0N,${d(16)},${d(16)}^FD${LABEL_FOOTER}^FS`,
    '^XZ',
  ].join('\n')
}

/** Gera um lote de etiquetas ZPL, uma por item, prontas para envio à impressora. */
export function buildZplBatch(items: AssetLabelData[], opts?: ZplOptions): string {
  return items.map((item) => buildZpl(item, opts)).join('\n')
}

/** Baixa o conteúdo ZPL como arquivo de texto (no-op fora do navegador). */
export function downloadZpl(zpl: string, filename: string): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return

  const blob = new Blob([zpl], { type: 'text/plain;charset=utf-8' })
  const objectUrl = URL.createObjectURL(blob)
  const anchor = document.createElement('a')

  anchor.href = objectUrl
  anchor.download = filename
  anchor.rel = 'noopener'
  anchor.style.display = 'none'

  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)

  URL.revokeObjectURL(objectUrl)
}

// ============================================================================
// Impressão em impressora comum (fallback)
// ============================================================================

/** Escapa texto para interpolação segura em HTML. */
function htmlEscape(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/** Monta o HTML autocontido da etiqueta 50x30 mm para impressoras comuns. */
export function printLabelHtml(data: AssetLabelData, qrDataUrl: string): string {
  const company = htmlEscape(firstFilled(data.company) ?? DEFAULT_COMPANY)
  const assetTag = htmlEscape(data.assetTag)
  const hostname = htmlEscape(data.hostname)
  const sector = htmlEscape(data.sector)
  const employeeName = htmlEscape(truncate(data.employeeName, EMPLOYEE_MAX_CHARS))
  const qrSrc = htmlEscape(qrDataUrl)
  const footer = htmlEscape(LABEL_FOOTER)

  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Etiqueta ${assetTag}</title>
<style>
  @page { size: 50mm 30mm; margin: 0; }
  * { box-sizing: border-box; }
  html, body {
    margin: 0;
    padding: 0;
    background: #ffffff;
    color: #0f172a;
    font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .etiqueta {
    width: 50mm;
    height: 30mm;
    padding: 2mm 2.2mm;
    display: flex;
    align-items: stretch;
    justify-content: space-between;
    gap: 1.6mm;
    overflow: hidden;
  }
  .dados {
    display: flex;
    flex-direction: column;
    justify-content: flex-start;
    min-width: 0;
    flex: 1 1 auto;
  }
  .empresa {
    margin: 0;
    font-size: 2.5mm;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    padding-bottom: 0.8mm;
    border-bottom: 0.3mm solid #0f172a;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .patrimonio {
    margin: 1.2mm 0 0;
    font-size: 5.2mm;
    font-weight: 800;
    line-height: 1.05;
    letter-spacing: -0.01em;
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .linha {
    margin: 0.7mm 0 0;
    font-size: 2.4mm;
    line-height: 1.25;
    color: #334155;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  /* O nome da máquina sai inteiro: quebra em mais de uma linha em vez de
     ser cortado com "...". Quebra também no meio da palavra, porque
     hostname costuma ser uma palavra só com hífens. */
  .linha--host {
    white-space: normal;
    overflow: visible;
    overflow-wrap: anywhere;
    word-break: break-word;
  }
  .linha strong { font-weight: 600; color: #0f172a; }
  .rodape {
    margin: auto 0 0;
    font-size: 2mm;
    letter-spacing: 0.04em;
    color: #64748b;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .qr {
    flex: 0 0 auto;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .qr img {
    width: 19mm;
    height: 19mm;
    display: block;
    image-rendering: pixelated;
  }
</style>
</head>
<body>
  <div class="etiqueta">
    <div class="dados">
      <p class="empresa">${company}</p>
      <p class="patrimonio">${assetTag}</p>
      <p class="linha linha--host"><strong>${hostname}</strong></p>
      <p class="linha">${sector}</p>
      <p class="linha">${employeeName}</p>
      <p class="rodape">${footer}</p>
    </div>
    <div class="qr">
      <img src="${qrSrc}" alt="QR Code do patrimônio ${assetTag}" />
    </div>
  </div>
</body>
</html>`
}
