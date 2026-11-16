import type { Component } from '../core/model'
import type { ComponentResult, ElementWaveform } from '../core/solver'
import { PROJECT_FILE_EXTENSION, projectFileName } from '../persistence/projectFile'
import type { Translate } from './i18n'

/**
 * Exportar os resultados para um ficheiro CSV (abre no Excel / LibreOffice).
 *
 * - Valores em unidades SI, SEM prefixos (0,004 e não "4 mA"), para se poderem fazer contas.
 * - Português e francês: separador ";" e vírgula decimal (o que o Excel espera nessas línguas);
 *   inglês: separador "," e ponto decimal.
 * - Linhas terminadas em CRLF; o BOM UTF-8 é posto ao descarregar (para os acentos e o Ω).
 */

export interface CsvFormat {
  separator: ';' | ','
  decimal: ',' | '.'
}

/** O formato do CSV a partir do separador decimal da língua. */
export function csvFormat(decimal: ',' | '.'): CsvFormat {
  return decimal === ',' ? { separator: ';', decimal: ',' } : { separator: ',', decimal: '.' }
}

/** Um número com 12 algarismos significativos (tira o "ruído" 0,30000000000000004). */
export function csvNumber(value: number, format: CsvFormat): string {
  if (!Number.isFinite(value)) return ''
  const text = String(Number(value.toPrecision(12)))
  return format.decimal === ',' ? text.replace('.', ',') : text
}

/** Um campo de texto: entre aspas se tiver o separador, aspas ou mudança de linha. */
function csvText(text: string, format: CsvFormat): string {
  return text.includes(format.separator) || /["\r\n]/.test(text)
    ? `"${text.replace(/"/g, '""')}"`
    : text
}

function csvLine(cells: readonly string[], format: CsvFormat): string {
  return cells.map((c) => csvText(c, format)).join(format.separator)
}

/**
 * Resistência do componente em Ω (resistência: o valor; lâmpada: U²/P nominais, como no core).
 * Fonte, interruptor, LED, díodo… não têm uma resistência fixa → undefined.
 */
export function componentResistance(c: Component): number | undefined {
  if (c.kind === 'resistor') return c.params.resistance
  if (c.kind === 'lamp') return c.params.ratedVoltage ** 2 / c.params.ratedPower
  return undefined
}

/** O estado mostrado na tabela (CV/CC da fonte, LED aceso/apagado, díodo conduz/bloqueado). */
function stateText(r: ComponentResult, t: Translate): string {
  if (r.sourceMode) return r.sourceMode === 'cc' ? t('results.sourceCc') : t('results.sourceCv')
  if (r.ledState) return r.ledState === 'on' ? t('results.ledOn') : t('results.ledOff')
  if (r.diodeState)
    return r.diodeState === 'conducting' ? t('results.diodeOn') : t('results.diodeOff')
  return ''
}

/**
 * Resultados DC: uma linha por componente com resultado (o GND não tem), pela ordem do circuito.
 * Colunas: nome; tipo; U (V); I (A); R (Ω); P (W); estado.
 */
export function dcResultsCsv(
  components: readonly Component[],
  results: ReadonlyMap<string, ComponentResult>,
  t: Translate,
  format: CsvFormat,
): string {
  const header = [
    t('results.component'),
    t('csv.kind'),
    'U (V)',
    'I (A)',
    'R (Ω)',
    'P (W)',
    t('csv.state'),
  ]
  const lines = [csvLine(header, format)]
  for (const c of components) {
    const r = results.get(c.id)
    if (!r) continue
    const resistance = componentResistance(c)
    lines.push(
      csvLine(
        [
          c.name,
          t(`kind.${c.kind}`),
          csvNumber(r.voltage, format),
          csvNumber(r.current, format),
          resistance === undefined ? '' : csvNumber(resistance, format),
          csvNumber(r.power, format),
          stateText(r, t),
        ],
        format,
      ),
    )
  }
  return lines.join('\r\n') + '\r\n'
}

/**
 * Transitório: uma linha por instante. Colunas: t (s); depois, para cada componente com curva,
 * "<nome> u (V)" e "<nome> i (A)".
 */
export function transientCsv(
  components: readonly Component[],
  times: readonly number[],
  waveforms: ReadonlyMap<string, ElementWaveform>,
  format: CsvFormat,
): string {
  const series = components.flatMap((c) => {
    const w = waveforms.get(c.id)
    return w ? [{ name: c.name, w }] : []
  })
  const header = ['t (s)', ...series.flatMap(({ name }) => [`${name} u (V)`, `${name} i (A)`])]
  const lines = [csvLine(header, format)]
  times.forEach((time, k) => {
    const cells = [csvNumber(time, format)]
    for (const { w } of series) {
      cells.push(csvNumber(w.voltage[k] ?? NaN, format), csvNumber(w.current[k] ?? NaN, format))
    }
    lines.push(csvLine(cells, format))
  })
  return lines.join('\r\n') + '\r\n'
}

/** "Divisor de tensão" → "divisor-de-tensao-resultados.csv". */
export function csvFileName(projectName: string): string {
  const base = projectFileName(projectName).slice(0, -PROJECT_FILE_EXTENSION.length)
  return `${base}-resultados.csv`
}

/** Descarrega o texto como ficheiro CSV (com BOM UTF-8, para o Excel ler bem os acentos). */
export function downloadCsv(fileName: string, text: string): void {
  const blob = new Blob(['\uFEFF', text], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 60_000)
}
