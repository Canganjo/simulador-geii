import { expect, test, type Page } from '@playwright/test'
import { sx, sy } from './grelha.ts'

/**
 * Critérios de aceitação do MVP (secção 19 do dossier) provados pela INTERFACE:
 * os circuitos são montados com o rato, como faria um estudante, e os resultados comparados
 * com o cálculo à mão da folha "Testes de referência" da planilha (tolerância 0,1 %).
 *
 * Os mesmos circuitos já são testados no motor (src/core/…/*.test.ts); aqui prova-se que o
 * caminho completo interface → estado → core → tabela dá os mesmos números.
 */

// Circuitos montados com 4 ou 5 fios: em paralelo com os outros testes passam dos 40 s.
test.setTimeout(90_000)

/** Tolerância relativa da planilha: 0,1 %. */
const TOLERANCE = 0.001

// ─── Ajudas ──────────────────────────────────────────────────────────────────────────────────

const menu = (page: Page) => page.getByRole('complementary', { name: 'Menu de componentes' })
const scene = (page: Page) => page.getByTestId('workspace')
const props = (page: Page) => page.getByRole('complementary', { name: 'Propriedades' })
const results = (page: Page) => page.getByRole('region', { name: 'Resultados' })

/** Larga um componente do menu na zona livre, (dx, dy) píxeis a partir do centro. */
async function dropAt(page: Page, item: string, dx: number, dy: number) {
  const box = await scene(page).boundingBox()
  if (!box) throw new Error('zona livre não encontrada')
  await menu(page)
    .getByRole('button', { name: item })
    .dragTo(scene(page), {
      targetPosition: { x: box.width / 2 + sx(dx), y: box.height / 2 + sy(dy) },
    })
}

/** Escreve um valor no painel de propriedades (o componente acabado de criar está selecionado). */
async function setParam(page: Page, field: string, value: string) {
  const input = props(page).getByRole('textbox', { name: field, exact: true })
  await input.fill(value)
  await input.press('Enter')
  await expect(input).toHaveValue(value)
}

async function anchor(page: Page, selector: string) {
  const box = await scene(page).locator(selector).boundingBox()
  if (!box) throw new Error(`âncora ${selector} não encontrada`)
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 }
}

/** Liga dois terminais com dois cliques. */
async function connect(page: Page, from: string, to: string) {
  const a = await anchor(page, `[data-terminal="${from}"]`)
  await page.mouse.click(a.x, a.y)
  await expect(page.getByRole('status')).toContainText(`A ligar ${from}`)
  const b = await anchor(page, `[data-terminal="${to}"]`)
  await page.mouse.click(b.x, b.y)
}

async function wireCount(page: Page) {
  return Number(await scene(page).locator('[data-wire-count]').getAttribute('data-wire-count'))
}

type Quantity = 'u' | 'i' | 'p'

/** Valor exato (SI) de uma grandeza na tabela de resultados. */
async function value(page: Page, component: string, q: Quantity): Promise<number> {
  const row = results(page).locator(`tr[data-component="${component}"]`)
  await expect(row).toBeVisible()
  return Number(await row.getAttribute(`data-${q}`))
}

/** Compara com o valor teórico: erro relativo ≤ 0,1 % (ou |x| < 1e-12 para um zero). */
function expectClose(actual: number, expected: number) {
  if (expected === 0) expect(Math.abs(actual)).toBeLessThan(1e-12)
  else expect(Math.abs(actual - expected) / Math.abs(expected)).toBeLessThanOrEqual(TOLERANCE)
}

async function simulate(page: Page) {
  await page.getByRole('button', { name: 'Simular' }).click()
  await expect(page.getByTestId('simulation-output')).toBeVisible()
}

/** V1 (12 V) à esquerda, R1 (1 kΩ) no centro, R2 (2 kΩ) à direita, GND em baixo, em série. */
async function divider(page: Page) {
  await page.goto('/')
  await menu(page).getByRole('button', { name: 'Resistência' }).click() // R1 no centro
  await dropAt(page, 'Resistência', 160, 0) // R2
  await setParam(page, 'Resistência', '2k')
  await dropAt(page, 'Fonte DC', -160, 0) // V1 (12 V por defeito)
  await dropAt(page, 'GND', 0, 120)
  await connect(page, 'V1:+', 'R1:a')
  await connect(page, 'R1:b', 'R2:a')
  await connect(page, 'R2:b', 'GND1:gnd')
  await connect(page, 'GND1:gnd', 'V1:-')
  await simulate(page)
}

// ─── Testes de referência da planilha ────────────────────────────────────────────────────────

test('referência 1, 2 e 5 — divisor 12 V (1 kΩ + 2 kΩ): 8 V no meio, 4 mA, 32 mW em R2', async ({
  page,
}) => {
  // I = 12 / (1000 + 2000) = 4 mA
  // V(meio) = U(R2) = 2000 × 0,004 = 8 V            (teste 1)
  // P(R2) = R2 × I² = 2000 × 0,004² = 0,032 W       (teste 5)
  await divider(page)
  expectClose(await value(page, 'R2', 'u'), 8)
  expectClose(await value(page, 'R1', 'i'), 0.004)
  expectClose(await value(page, 'R2', 'i'), 0.004)
  expectClose(await value(page, 'R2', 'p'), 0.032)
  // A tabela mostra os mesmos valores, formatados.
  await expect(results(page).locator('tr[data-component="R2"]')).toContainText('8 V')
  await expect(results(page).locator('tr[data-component="R2"]')).toContainText('32 mW')
})

test('Exportar CSV — o divisor sai em unidades SI, com ";" e vírgula decimal', async ({ page }) => {
  // Os mesmos valores do teste anterior: I = 4 mA, U(R1) = 4 V, U(R2) = 8 V, P(R2) = 32 mW.
  await divider(page)
  const downloading = page.waitForEvent('download')
  await results(page).getByRole('button', { name: 'Exportar CSV' }).click()
  const download = await downloading
  expect(download.suggestedFilename()).toMatch(/-resultados\.csv$/)
  const path = await download.path()
  const { readFile } = await import('node:fs/promises')
  const text = await readFile(path, 'utf8')
  expect(text.startsWith('\uFEFF')).toBe(true) // BOM: o Excel lê bem o "Ω" e os acentos
  const lines = text.slice(1).split('\r\n')
  expect(lines[0]).toBe('Componente;Tipo;U (V);I (A);R (Ω);P (W);Estado')
  expect(lines).toContain('V1;Fonte DC;12;0,004;;-0,048;CV')
  expect(lines).toContain('R1;Resistência;4;0,004;1000;0,016;')
  expect(lines).toContain('R2;Resistência;8;0,004;2000;0,032;')
})

test('referência 3 e 4 — 1 kΩ ∥ 1 kΩ sob 10 V: I total = 20 mA, Req = 500 Ω', async ({ page }) => {
  // Cada ramo: 10 / 1000 = 10 mA → I total = 20 mA (teste 3)
  // Req = U / I total = 10 / 0,02 = 500 Ω            (teste 4)
  await page.goto('/')
  await menu(page).getByRole('button', { name: 'Resistência' }).click() // R1 no centro
  await dropAt(page, 'Resistência', 0, -120) // R2 por cima
  await dropAt(page, 'Fonte DC', -160, 0) // V1
  await setParam(page, 'Tensão', '10')
  await dropAt(page, 'GND', 160, 120)
  await connect(page, 'V1:+', 'R1:a')
  await connect(page, 'V1:+', 'R2:a')
  await connect(page, 'R1:b', 'GND1:gnd')
  await connect(page, 'R2:b', 'GND1:gnd')
  await connect(page, 'GND1:gnd', 'V1:-')
  await simulate(page)

  const total = await value(page, 'V1', 'i') // corrente fornecida pela fonte
  expectClose(total, 0.02)
  expectClose((await value(page, 'V1', 'u')) / total, 500)
  expectClose(await value(page, 'R1', 'i'), 0.01)
  expectClose(await value(page, 'R2', 'i'), 0.01)
})

test('referência 6 — demo 12 V + 470 Ω + LED (Vf = 2 V): I = 21,28 mA', async ({ page }) => {
  // I = (12 − 2) / 470 = 0,021277 A
  await page.goto('/')
  await menu(page).getByRole('button', { name: 'Resistência' }).click()
  await setParam(page, 'Resistência', '470')
  await dropAt(page, 'Fonte DC', -160, 0)
  await dropAt(page, 'LED', 160, 0)
  await dropAt(page, 'GND', 0, 120)
  await connect(page, 'V1:+', 'R1:a')
  await connect(page, 'R1:b', 'D1:anodo')
  await connect(page, 'D1:catodo', 'GND1:gnd')
  await connect(page, 'GND1:gnd', 'V1:-')
  await simulate(page)

  expectClose(await value(page, 'D1', 'i'), 10 / 470)
  expectClose(await value(page, 'D1', 'u'), 2)
  await expect(results(page).locator('tr[data-component="D1"]')).toContainText('aceso')
})

test('referência 7 — interruptor aberto: I = 0 A e a fonte não fornece nada', async ({ page }) => {
  // Circuito aberto: nenhuma corrente pode circular → I = 0 A em todo o lado.
  await page.goto('/')
  await menu(page).getByRole('button', { name: 'Resistência' }).click() // R1
  await dropAt(page, 'Interruptor', 160, 0) // S1 (aberto por defeito)
  await expect(props(page).getByRole('checkbox', { name: 'Fechado' })).not.toBeChecked()
  await dropAt(page, 'Fonte DC', -160, 0)
  await dropAt(page, 'GND', 0, 120)
  await connect(page, 'V1:+', 'R1:a')
  await connect(page, 'R1:b', 'S1:a')
  await connect(page, 'S1:b', 'GND1:gnd')
  await connect(page, 'GND1:gnd', 'V1:-')
  await simulate(page)

  expectClose(await value(page, 'R1', 'i'), 0)
  expectClose(await value(page, 'S1', 'i'), 0)
  expectClose(await value(page, 'V1', 'p'), 0)
  // A tensão toda fica aos terminais do interruptor aberto: U(S1) = 12 V.
  expectClose(await value(page, 'S1', 'u'), 12)

  // Clicar no interruptor (na cena) fecha-o e o circuito volta a ser calculado sozinho:
  //   I = 12 V / 1 kΩ = 12 mA ; U(S1) = 0 V.
  const a = await anchor(page, '[data-terminal="S1:a"]')
  const b = await anchor(page, '[data-terminal="S1:b"]')
  const middle = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
  await page.mouse.click(middle.x, middle.y)
  await expect(props(page).getByRole('checkbox', { name: 'Fechado' })).toBeChecked()
  await expect.poll(async () => value(page, 'R1', 'i')).toBeCloseTo(12 / 1000, 6)
  // O interruptor fechado tem uma resistência pequenina (1 mΩ): U(S1) ≈ 12 µV, quase 0.
  expect(Math.abs(await value(page, 'S1', 'u'))).toBeLessThan(1e-4)

  // Outro clique abre-o outra vez: I = 0 A.
  await page.mouse.click(middle.x, middle.y)
  await expect(props(page).getByRole('checkbox', { name: 'Fechado' })).not.toBeChecked()
  await expect.poll(async () => value(page, 'R1', 'i')).toBeCloseTo(0, 6)
})

// ─── Demonstração de referência (secção 20) ──────────────────────────────────────────────────

test('demonstração: arrastar, ligar, simular, I e P, a lâmpada acende; tirar um fio dá erro', async ({
  page,
}) => {
  //   V1 12 V ── R1 10 Ω ── L1 (12 V / 1 W → 144 Ω) ── GND
  //   I = 12 / (10 + 144) = 77,92 mA ; P(L1) = 144 × 0,07792² = 0,8743 W → brilho 0,87
  await page.goto('/')
  await dropAt(page, 'Resistência', 0, 0)
  await setParam(page, 'Resistência', '10')
  await dropAt(page, 'Fonte DC', -160, 0)
  await dropAt(page, 'Lâmpada', 160, 0)
  await dropAt(page, 'GND', 0, 120)
  await connect(page, 'V1:+', 'R1:a')
  await connect(page, 'R1:b', 'L1:a')
  await connect(page, 'L1:b', 'GND1:gnd')
  await connect(page, 'GND1:gnd', 'V1:-')
  await simulate(page)

  expectClose(await value(page, 'L1', 'i'), 12 / 154)
  expectClose(await value(page, 'L1', 'p'), 144 * (12 / 154) ** 2)
  const lamp = scene(page).locator('[data-component-label="L1"]')
  await expect(lamp).toHaveAttribute('data-glow', '0.87')
  await expect(results(page).locator('tr[data-component="L1"]')).toContainText('77,9 mA')

  // Tirar o fio GND → V1− (selecionar e Delete) e simular de novo: aparece um problema.
  const last = await scene(page).locator('[data-wire]').last().boundingBox()
  if (!last) throw new Error('fio não encontrado')
  await page.mouse.click(last.x + last.width / 2, last.y + last.height / 2)
  await page.keyboard.press('Delete')
  expect(await wireCount(page)).toBe(3)
  await simulate(page)
  await expect(results(page).locator('[data-severity]').first()).toBeVisible()
  await expect(lamp).toHaveAttribute('data-glow', '0.00')
  await expect(scene(page).locator('[data-component-label="V1"]')).not.toHaveAttribute(
    'data-issue',
    'none',
  )
})

// ─── Fios só entre terminais válidos ─────────────────────────────────────────────────────────

test('fios: um terminal não se liga a si próprio e o mesmo fio não se repete', async ({ page }) => {
  await page.goto('/')
  await menu(page).getByRole('button', { name: 'Resistência' }).click() // R1
  await dropAt(page, 'Resistência', 160, 0) // R2

  // Clicar duas vezes no mesmo terminal não cria nenhum fio.
  const a = await anchor(page, '[data-terminal="R1:b"]')
  await page.mouse.click(a.x, a.y)
  await page.mouse.click(a.x, a.y)
  expect(await wireCount(page)).toBe(0)
  await page.keyboard.press('Escape')

  await connect(page, 'R1:b', 'R2:a')
  expect(await wireCount(page)).toBe(1)
  // O mesmo fio outra vez (nos dois sentidos) é ignorado.
  await connect(page, 'R1:b', 'R2:a')
  await connect(page, 'R2:a', 'R1:b')
  expect(await wireCount(page)).toBe(1)
})

// ─── Interface legível nas resoluções previstas ──────────────────────────────────────────────

for (const { name, width, height } of [
  { name: 'portátil 1366×768', width: 1366, height: 768 },
  { name: 'monitor 1920×1080', width: 1920, height: 1080 },
]) {
  test(`resolução ${name}: tudo cabe no ecrã, sem barra de deslocamento`, async ({ page }) => {
    await page.setViewportSize({ width, height })
    await page.goto('/')
    // Nada sai do ecrã: a página não tem deslocamento horizontal nem vertical.
    const overflow = await page.evaluate(
      '[document.documentElement.scrollWidth - innerWidth, document.documentElement.scrollHeight - innerHeight]',
    )
    expect(overflow).toEqual([0, 0])
    // As cinco zonas estão visíveis e a zona livre é a maior.
    await expect(menu(page)).toBeVisible()
    await expect(props(page)).toBeVisible()
    await expect(results(page)).toBeVisible()
    await expect(page.getByRole('button', { name: 'Simular' })).toBeInViewport()
    const box = await scene(page).boundingBox()
    expect(box?.width ?? 0).toBeGreaterThan(width / 2)
    expect(box?.height ?? 0).toBeGreaterThan(height / 2)
  })
}

// ─── E10: díodo real (Shockley, Newton-Raphson) ──────────────────────────────────────────────

test('díodo real: 5 V + 1 kΩ + 1N4148 → U = 0,6505 V, I = 4,35 mA, "conduz"', async ({ page }) => {
  //   À mão (ver src/core/solver/newton.test.ts): U = 0,045293 · ln(I / 2,52e-9 + 1),
  //   I = (5 − U) / 1000 → U = 0,650463 V, I = 4,349537 mA
  await page.goto('/')
  await menu(page).getByRole('button', { name: 'Resistência' }).click() // R1 (1 kΩ)
  await dropAt(page, 'Díodo', 160, 0) // D1
  // Propriedades do díodo: Is e n do 1N4148
  await expect(
    props(page).getByRole('textbox', { name: 'Corrente de saturação (Is)' }),
  ).toHaveValue('2,52n')
  await expect(
    props(page).getByRole('textbox', { name: 'Coeficiente de emissão (n)' }),
  ).toHaveValue('1,752')
  await dropAt(page, 'Fonte DC', -160, 0)
  await setParam(page, 'Tensão', '5')
  await dropAt(page, 'GND', 0, 120)
  await connect(page, 'V1:+', 'R1:a')
  await connect(page, 'R1:b', 'D1:anodo')
  await connect(page, 'D1:catodo', 'GND1:gnd')
  await connect(page, 'GND1:gnd', 'V1:-')
  await simulate(page)

  const relClose = (a: number, b: number) => expect(Math.abs(a - b) / b).toBeLessThan(1e-5)
  relClose(await value(page, 'D1', 'u'), 0.650463)
  relClose(await value(page, 'D1', 'i'), 4.349537e-3)
  const row = results(page).locator('tr[data-component="D1"]')
  await expect(row).toContainText('conduz')
  await expect(row).toContainText('4,35 mA')
})
