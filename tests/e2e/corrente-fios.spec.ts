import { expect, test, type Page } from '@playwright/test'
import { sx, sy } from './grelha.ts'

/**
 * "Mostrar corrente": cargas animadas nos fios, com a corrente do solver.
 * Circuito: V1 = 12 V, R1 = 1 kΩ → I = 12 V / 1 kΩ = 12 mA, do + da fonte para R1.
 */

const scene = (page: Page) => page.getByTestId('workspace')
const menu = (page: Page) => page.getByRole('complementary', { name: 'Menu de componentes' })

async function anchor(page: Page, selector: string) {
  const box = await scene(page).locator(selector).first().boundingBox()
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

test('Mostrar corrente: valor e sentido ao passar o rato, sentido dos eletrões, velocidade', async ({
  page,
}) => {
  await page.goto('/')
  await dropAt(page, 'Fonte DC', -160, 0)
  await dropAt(page, 'GND', -160, 160)
  await dropAt(page, 'Resistência', 80, 0)
  await page.mouse.click(5, 300) // tira a seleção (os botões − / + da fonte ficam escondidos)

  await connect(page, 'V1:+', 'R1:a')
  await connect(page, 'R1:b', 'V1:-')
  await connect(page, 'V1:-', 'GND1:gnd')
  await expect(scene(page).locator('[data-wire-count]')).toHaveAttribute('data-wire-count', '3')

  // Sem simulação, o painel lembra que é preciso Simular.
  const showCurrent = page.getByRole('button', { name: 'Mostrar corrente' })
  await showCurrent.click()
  await expect(showCurrent).toHaveAttribute('aria-pressed', 'true')
  const controls = page.getByRole('region', { name: 'Corrente nos fios' })
  await expect(controls).toContainText('Clica em Simular')

  await page.getByRole('button', { name: 'Simular' }).click()
  await expect(controls).not.toContainText('Clica em Simular')

  // Rato por cima do 1.º fio (V1:+ → R1:a): 12 mA, do + da fonte para R1.
  const wire = await anchor(page, '[data-wire]')
  await page.mouse.move(wire.x, wire.y)
  const tip = page.getByTestId('wire-current')
  await expect(tip).toHaveText(/I = 12 mA\s+V1:\+ → R1:a/)

  // Sentido dos eletrões e velocidade: só mudam a animação, o valor continua o mesmo.
  await controls.getByRole('radio', { name: 'Sentido dos eletrões' }).check()
  await controls.getByRole('slider').fill('2')
  await expect(controls).toContainText('×2,00')
  // (o rato saiu do fio para mexer no painel: a etiqueta some; volta ao passar outra vez)
  await expect(tip).toBeHidden()
  await page.mouse.move(wire.x, wire.y)
  await expect(tip).toHaveText(/I = 12 mA\s+V1:\+ → R1:a/)
  await page.screenshot({ path: 'test-results/corrente-fios.png' })

  // Transitório (só R: a corrente é a mesma em todos os instantes): as cargas mostram o
  // instante simulado, que avança com o tempo (a simulação inteira passa em 6 s e recomeça).
  await page.getByRole('button', { name: 'Transitório' }).click()
  const dialog = page.getByRole('dialog', { name: 'Simulação no tempo (transitório)' })
  await dialog.getByRole('button', { name: 'Simular no tempo' }).click()
  const clock = page.getByTestId('current-clock')
  await expect(clock).toHaveText(/^t = /)
  const first = await clock.textContent()
  await expect.poll(() => clock.textContent()).not.toBe(first)
  await page.mouse.move(wire.x, wire.y)
  await expect(tip).toHaveText(/I = 12 mA/)

  // Desligar: o painel desaparece.
  await showCurrent.click()
  await expect(controls).toBeHidden()
})
