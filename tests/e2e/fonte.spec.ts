import { expect, test, type Page } from '@playwright/test'
import { sx, sy } from './grelha.ts'

/**
 * Fonte DC regulável (D-013): botões − / +, recálculo automático e limite de corrente (CV/CC).
 *
 * Circuito: V1 ── R1 = 47 Ω ── GND
 *   12 V, Imax = 3 A:       I = 12 / 47 = 255,3 mA (< 3 A) → CV
 *   12,5 V (5 cliques em +): I = 12,5 / 47 = 266,0 mA
 *   Imax = 100 mA:          pediria 266 mA > 100 mA → CC: I = 100 mA, U = 47 × 0,1 = 4,7 V
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
      targetPosition: { x: box.width / 2 + sx(dx), y: box.height / 2 + sy(dy) },
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

const voltageField = (page: Page) =>
  props(page).getByRole('textbox', { name: 'Tensão', exact: true })
const plus = (page: Page) => props(page).getByRole('button', { name: /^Aumentar a tensão/ })
const minus = (page: Page) => props(page).getByRole('button', { name: /^Diminuir a tensão/ })

/** V1 (12 V, 3 A) ── R1 (47 Ω) ── GND, montado pela interface; no fim V1 fica selecionada. */
async function build(page: Page) {
  await page.goto('/')
  await menu(page).getByRole('button', { name: 'Resistência' }).click()
  await setParam(page, 'Resistência', '47')
  await dropAt(page, 'Fonte DC', -160, 0)
  await expect(scene(page).locator('[data-component-label="V1"]')).toBeVisible()
  await dropAt(page, 'GND', 0, 120)
  await connect(page, 'V1:+', 'R1:a')
  await connect(page, 'R1:b', 'GND1:gnd')
  await connect(page, 'GND1:gnd', 'V1:-')
  // Clicar no meio da fonte (entre os terminais + e −) seleciona-a.
  const a = await anchor(page, '[data-terminal="V1:+"]')
  const b = await anchor(page, '[data-terminal="V1:-"]')
  await page.mouse.click((a.x + b.x) / 2, (a.y + b.y) / 2)
  await expect(props(page).getByTestId('selected-name')).toHaveText('V1')
}

test('botões + / − mudam a tensão e os resultados sem voltar a carregar em Simular', async ({
  page,
}) => {
  await build(page)
  // Valores por defeito: 12 V, limite de 3 A.
  await expect(voltageField(page)).toHaveValue('12')
  await expect(
    props(page).getByRole('textbox', { name: 'Limite de corrente (Imax)', exact: true }),
  ).toHaveValue('3')
  await expect(props(page).getByTestId('source-max-power')).toContainText('36 W') // 12 × 3

  // Antes de Simular os botões também funcionam (só mudam o valor).
  await plus(page).click()
  await expect(voltageField(page)).toHaveValue('12,1')
  await minus(page).click()
  await expect(voltageField(page)).toHaveValue('12')

  await page.getByRole('button', { name: 'Simular', exact: true }).click()
  expect(await value(page, 'R1', 'data-i')).toBeCloseTo(12 / 47, 9)
  await expect(row(page, 'V1').locator('[data-source-mode]')).toHaveAttribute(
    'data-source-mode',
    'cv',
  )

  // 5 cliques em + → 12,5 V; os resultados acompanham sozinhos.
  for (let k = 0; k < 5; k++) await plus(page).click()
  await expect(voltageField(page)).toHaveValue('12,5')
  await expect.poll(() => value(page, 'R1', 'data-i')).toBeCloseTo(12.5 / 47, 9)
  expect(await value(page, 'V1', 'data-u')).toBeCloseTo(12.5, 9)

  // Shift + clique em − → −1 V.
  await minus(page).click({ modifiers: ['Shift'] })
  await expect(voltageField(page)).toHaveValue('11,5')
  await expect.poll(() => value(page, 'R1', 'data-i')).toBeCloseTo(11.5 / 47, 9)

  // Cada clique é um passo do desfazer: Ctrl+Z volta a 12,5 V (e recalcula).
  await page.keyboard.press('Control+z')
  await expect(voltageField(page)).toHaveValue('12,5')
  await expect.poll(() => value(page, 'R1', 'data-i')).toBeCloseTo(12.5 / 47, 9)

  // Os botões em cima da fonte (na cena) fazem o mesmo.
  const sceneStepper = page.locator('[data-source-stepper="scene"]')
  await sceneStepper.getByRole('button', { name: /^Aumentar a tensão/ }).click()
  await expect(voltageField(page)).toHaveValue('12,6')
  await expect.poll(() => value(page, 'R1', 'data-i')).toBeCloseTo(12.6 / 47, 9)
})

test('manter + carregado repete, e conta como um só passo do desfazer', async ({ page }) => {
  await build(page)
  const box = await plus(page).boundingBox()
  if (!box) throw new Error('botão + não encontrado')
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
  await page.mouse.down()
  await page.waitForTimeout(1200) // 1 passo já + repetições depois de 0,4 s
  await page.mouse.up()
  const held = Number((await voltageField(page).inputValue()).replace(',', '.'))
  expect(held).toBeGreaterThan(12.3)

  await page.keyboard.press('Control+z')
  await expect(voltageField(page)).toHaveValue('12')
})

test('limite de corrente: Imax = 100 mA → CC, I = 100 mA e U = 4,7 V; tirar um fio limpa', async ({
  page,
}) => {
  await build(page)
  await page.getByRole('button', { name: 'Simular', exact: true }).click()
  expect(await value(page, 'V1', 'data-u')).toBeCloseTo(12, 9)

  // Mudar o limite também recalcula sozinho.
  await setParam(page, 'Limite de corrente (Imax)', '100m')
  await expect(row(page, 'V1').locator('[data-source-mode]')).toHaveAttribute(
    'data-source-mode',
    'cc',
  )
  expect(await value(page, 'V1', 'data-i')).toBeCloseTo(0.1, 9)
  expect(await value(page, 'V1', 'data-u')).toBeCloseTo(4.7, 9)
  expect(await value(page, 'R1', 'data-u')).toBeCloseTo(4.7, 9)
  await expect(props(page).getByTestId('source-mode')).toHaveAttribute('data-mode', 'cc')
  await expect(page.getByRole('region', { name: 'Resultados' })).toContainText(
    'limite de corrente atingido (CC)',
  )
  await expect(scene(page).locator('[data-component-label="V1"]')).toHaveAttribute(
    'data-issue',
    'warning',
  )

  // Baixar a tensão para 4 V: 4 / 47 = 85,1 mA < 100 mA → volta a CV.
  await setParam(page, 'Tensão', '4')
  await expect(row(page, 'V1').locator('[data-source-mode]')).toHaveAttribute(
    'data-source-mode',
    'cv',
  )
  expect(await value(page, 'R1', 'data-i')).toBeCloseTo(4 / 47, 9)

  // Mudar as ligações (apagar um fio) limpa os resultados, como antes.
  const w = await scene(page).locator('[data-wire]').first().boundingBox()
  if (!w) throw new Error('fio não encontrado')
  await page.mouse.click(w.x + w.width / 2, w.y + w.height / 2)
  await page.keyboard.press('Delete')
  await expect(page.getByTestId('results-table')).toHaveCount(0)
})
