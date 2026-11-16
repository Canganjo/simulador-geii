import { expect, test, type Page } from '@playwright/test'
import { sx, sy } from './grelha.ts'

/**
 * Voltímetro e amperímetro (E10, D-016).
 *
 * Divisor: V1 = 12 V ── AM1 ── R1 = 1 kΩ ──●── R2 = 2 kΩ ── GND, e VM1 aos terminais de R2.
 *   U(R2) = 12 × 2000 / 3000 = 8 V ; I = 12 / 3000 = 4 mA.
 *   O voltímetro (10 MΩ) e o amperímetro (1 mΩ) mudam estes valores em menos de 0,01 %.
 */

test.setTimeout(90_000)

const scene = (page: Page) => page.getByTestId('workspace')
const props = (page: Page) => page.getByRole('complementary', { name: 'Propriedades' })
const menu = (page: Page) => page.getByRole('complementary', { name: 'Menu de componentes' })
const results = (page: Page) => page.getByTestId('results-table')
const label = (page: Page, name: string) => scene(page).locator(`[data-component-label="${name}"]`)

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

async function reading(page: Page, name: string) {
  return Number(await label(page, name).getAttribute('data-reading'))
}

test('voltímetro em paralelo lê 8 V e amperímetro em série lê 4 mA', async ({ page }) => {
  await page.goto('/')
  await expect(menu(page).getByRole('button', { name: 'Voltímetro' })).toBeVisible()
  await expect(menu(page).getByRole('button', { name: 'Amperímetro' })).toBeVisible()

  await dropAt(page, 'Fonte DC', -160, 0)
  await dropAt(page, 'Amperímetro', 0, -120)
  await dropAt(page, 'Resistência', 160, -120)
  await setParam(page, 'Resistência', '1k')
  await dropAt(page, 'Resistência', 160, 0)
  await setParam(page, 'Resistência', '2k')
  await dropAt(page, 'Voltímetro', 160, 120)
  await dropAt(page, 'GND', 0, 120)

  await connect(page, 'V1:+', 'AM1:+')
  await connect(page, 'AM1:-', 'R1:a')
  await connect(page, 'R1:b', 'R2:a')
  await connect(page, 'R2:b', 'GND1:gnd')
  await connect(page, 'VM1:+', 'R2:a')
  await connect(page, 'VM1:-', 'R2:b')
  await connect(page, 'GND1:gnd', 'V1:-')

  // Antes de Simular não há leitura.
  await expect(label(page, 'VM1')).not.toHaveAttribute('data-reading')

  await page.getByRole('button', { name: 'Simular', exact: true }).click()
  await expect(results(page)).toBeVisible()
  await expect(results(page).locator('[data-severity]')).toHaveCount(0)
  expect(Math.abs((await reading(page, 'VM1')) - 8)).toBeLessThan(8e-3) // 0,1 %
  expect(Math.abs((await reading(page, 'AM1')) - 0.004)).toBeLessThan(4e-6)
  await expect(results(page).locator('tr[data-component="VM1"]')).toContainText('8 V')
  await expect(results(page).locator('tr[data-component="AM1"]')).toContainText('4 mA')
})

test('amperímetro em paralelo com a fonte → erro de curto-circuito', async ({ page }) => {
  await page.goto('/')
  await dropAt(page, 'Fonte DC', -160, 0)
  await dropAt(page, 'Amperímetro', 0, -120)
  await dropAt(page, 'Resistência', 0, 0)
  await dropAt(page, 'GND', 0, 120)
  await connect(page, 'V1:+', 'R1:a')
  await connect(page, 'R1:b', 'GND1:gnd')
  await connect(page, 'GND1:gnd', 'V1:-')
  // Erro típico: o amperímetro ligado diretamente aos bornes da fonte.
  await connect(page, 'AM1:+', 'V1:+')
  await connect(page, 'AM1:-', 'V1:-')

  await page.getByRole('button', { name: 'Simular', exact: true }).click()
  const error = page.locator('[data-severity="error"]').first()
  await expect(error).toContainText('amperímetro está em paralelo com a fonte')
  await expect(label(page, 'V1')).toHaveAttribute('data-issue', 'error')
})
