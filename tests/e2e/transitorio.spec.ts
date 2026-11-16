import { expect, test, type Page } from '@playwright/test'

/**
 * Condensador e bobina na interface + botão Transitório (E10-4).
 *
 * Circuito RC: V1 = 10 V ── R1 = 1 kΩ ── C1 = 100 µF ── GND   (τ = R·C = 0,1 s)
 *   Simular (DC):  condensador = circuito aberto → I = 0, u_C = 10 V.
 *   Transitório 0,5 s, passo 1 ms (Euler implícito, a = h/τ = 0,01, k = 500 passos):
 *     u_C = 10 × (1 − 1,01^(−500)) = 9,93085 V   (exato: 10 × (1 − e^(−5)) = 9,93262 V)
 */

test.setTimeout(90_000)

const scene = (page: Page) => page.getByTestId('workspace')
const props = (page: Page) => page.getByRole('complementary', { name: 'Propriedades' })
const menu = (page: Page) => page.getByRole('complementary', { name: 'Menu de componentes' })

async function anchor(page: Page, selector: string) {
  const box = await scene(page).locator(selector).boundingBox()
  if (!box) throw new Error(`âncora ${selector} não encontrada`)
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 }
}

async function connect(page: Page, from: string, to: string) {
  const a = await anchor(page, `[data-terminal="${from}"]`)
  await page.mouse.click(a.x, a.y)
  await expect(page.getByRole('status')).toContainText(`A ligar ${from}`)
  const b = await anchor(page, `[data-terminal="${to}"]`)
  await page.mouse.click(b.x, b.y)
}

async function dropAt(page: Page, item: string, dx: number, dy: number) {
  const box = await scene(page).boundingBox()
  if (!box) throw new Error('zona livre não encontrada')
  await menu(page)
    .getByRole('button', { name: item })
    .dragTo(scene(page), {
      targetPosition: { x: box.width / 2 + dx, y: box.height / 2 + dy },
    })
}

async function setParam(page: Page, name: string, value: string) {
  const field = props(page).getByRole('textbox', { name, exact: true })
  await field.fill(value)
  await field.press('Enter')
}

const row = (page: Page, name: string) =>
  page.getByTestId('results-table').locator(`[data-component="${name}"]`)

async function value(page: Page, name: string, attr: 'data-u' | 'data-i') {
  return Number(await row(page, name).getAttribute(attr))
}

/** Monta o circuito RC pela interface (V1 = 10 V, R1 = 1 kΩ, C1 = 100 µF, GND). */
async function buildRc(page: Page) {
  await menu(page).getByRole('button', { name: 'Resistência' }).click()
  await setParam(page, 'Resistência', '1k')
  await dropAt(page, 'Fonte DC', -160, 0)
  await setParam(page, 'Tensão', '10')
  await dropAt(page, 'Condensador', 160, 0)
  await expect(scene(page).locator('[data-component-label="C1"]')).toBeVisible()
  // Valor por defeito: 100 µF, descarregado.
  await expect(props(page).getByRole('textbox', { name: 'Capacidade', exact: true })).toHaveValue(
    /^100\s*µ$/, // a unidade (F) aparece ao lado do campo
  )
  await dropAt(page, 'GND', 0, 120)
  await connect(page, 'V1:+', 'R1:a')
  await connect(page, 'R1:b', 'C1:a')
  await connect(page, 'C1:b', 'GND1:gnd')
  await connect(page, 'GND1:gnd', 'V1:-')
}

test('RC: Simular (DC) → u_C = 10 V; Transitório 0,5 s → u_C ≈ 9,93 V', async ({ page }) => {
  await page.goto('/')
  // Os dois componentes novos estão no menu, em Passivos.
  await expect(menu(page).getByRole('button', { name: 'Condensador' })).toBeVisible()
  await expect(menu(page).getByRole('button', { name: 'Bobina' })).toBeVisible()
  await buildRc(page)

  // DC: o condensador é um circuito aberto.
  await page.getByRole('button', { name: 'Simular', exact: true }).click()
  await expect(page.getByTestId('results-table')).toBeVisible()
  expect(await value(page, 'C1', 'data-u')).toBeCloseTo(10, 6)
  expect(await value(page, 'C1', 'data-i')).toBe(0)
  await expect(page.getByTestId('transient-info')).toHaveCount(0)

  // Transitório com os valores por defeito (0,5 s, passo 1 ms).
  await page.getByRole('button', { name: 'Transitório' }).click()
  const dialog = page.getByRole('dialog', { name: 'Simulação no tempo (transitório)' })
  await expect(dialog.getByRole('textbox', { name: 'Duração' })).toHaveValue('0,5 s')
  await expect(dialog.getByRole('textbox', { name: 'Passo' })).toHaveValue('1 ms')
  await dialog.getByRole('button', { name: 'Simular no tempo' }).click()
  await expect(dialog).toHaveCount(0)
  await expect(page.getByTestId('transient-info')).toContainText('500')
  expect(Math.abs((await value(page, 'C1', 'data-u')) - 9.93085)).toBeLessThan(1e-4)
  // I = (10 − 9,93085) / 1000 = 0,06915 / 1000 = 69,15 µA
  expect(Math.abs((await value(page, 'R1', 'data-i')) - 69.15e-6)).toBeLessThan(1e-7)

  // Passos a mais → mensagem na janela, sem simular.
  await page.getByRole('button', { name: 'Transitório' }).click()
  await dialog.getByRole('textbox', { name: 'Passo' }).fill('1 µs')
  await dialog.getByRole('button', { name: 'Simular no tempo' }).click()
  await expect(dialog.getByRole('alert')).toContainText('500000 passos')
  await dialog.getByRole('button', { name: 'Cancelar' }).first().click()
  await expect(dialog).toHaveCount(0)
})

test('gráfico (E10-5): u(t) e i(t) do C1, τ ≈ 0,1 s, cursor e troca para R1', async ({ page }) => {
  await page.goto('/')
  await buildRc(page)
  await page.getByRole('button', { name: 'Transitório' }).click()
  await page.getByRole('button', { name: 'Simular no tempo' }).click()

  const chart = page.getByTestId('waveform-chart')
  await expect(chart).toBeVisible()
  // O GND1 ficou selecionado (foi o último largado) e não tem curvas → mostra o 1.º condensador.
  await expect(chart).toHaveAttribute('data-component', 'C1')
  await expect(chart.locator('[data-plot="voltage"]')).toBeVisible()
  await expect(chart.locator('[data-plot="current"]')).toBeVisible()
  // O painel cresceu para o gráfico caber.
  const panel = await page.getByRole('region', { name: 'Resultados' }).boundingBox()
  expect(panel?.height ?? 0).toBeGreaterThanOrEqual(300)

  // τ medido na curva: R·C = 1000 × 100e-6 = 0,1 s (Euler com h = 1 ms dá ≈ 0,1005 s).
  const tau = Number(await chart.getByTestId('chart-tau').getAttribute('data-tau'))
  expect(Math.abs(tau - 0.1)).toBeLessThan(0.002)

  // Sem cursor, os valores são os do fim: u = 9,93085 V.
  const readout = chart.getByTestId('chart-readout')
  expect(Math.abs(Number(await readout.getAttribute('data-u')) - 9.93085)).toBeLessThan(1e-4)

  // Cursor a meio do gráfico (t ≈ 0,25 s): u = 10·(1 − 1,01^(−k)) no passo k = t / 1 ms.
  const area = await chart.getByTestId('chart-area-voltage').boundingBox()
  if (!area) throw new Error('gráfico sem área')
  await page.mouse.move(area.x + area.width / 2, area.y + area.height / 2, { steps: 3 })
  await expect
    .poll(async () => Math.abs(Number(await readout.getAttribute('data-t')) - 0.25))
    .toBeLessThan(0.01)
  const time = Number(await readout.getAttribute('data-t'))
  const k = Math.round(time / 1e-3)
  expect(Number(await readout.getAttribute('data-u'))).toBeCloseTo(10 * (1 - 1.01 ** -k), 6)
  // i = (10 − u) / R (mesma corrente em R1 e C1)
  expect(Number(await readout.getAttribute('data-i'))).toBeCloseTo((10 * 1.01 ** -k) / 1000, 9)

  // Escolher R1 na lista → o gráfico mostra o R1 (e o R1 fica selecionado na cena).
  await chart.getByRole('combobox').selectOption({ label: 'R1' })
  await expect(chart).toHaveAttribute('data-component', 'R1')
  await expect(scene(page).locator('[data-component-label="R1"]')).toHaveAttribute(
    'data-selected',
    'true',
  )
  await expect(chart.getByTestId('chart-tau')).toHaveCount(0) // τ só para C e L
})
