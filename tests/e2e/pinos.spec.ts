import { expect, test, type Page } from '@playwright/test'
import { sx } from './grelha.ts'

/**
 * Pinos de ligação como no LTspice: terminal livre = quadrado aberto ("open"), com um fio =
 * o fio continua a pata ("joined"), com dois ou mais fios = ponto de junção ("junction").
 */

test.setTimeout(90_000)

const scene = (page: Page) => page.getByTestId('workspace')
const pin = (page: Page, name: string) => scene(page).locator(`[data-terminal="${name}"]`)

/** Centro (em píxeis) de um elemento âncora da cena. */
async function anchor(page: Page, selector: string) {
  const box = await scene(page).locator(selector).boundingBox()
  if (!box) throw new Error(`âncora ${selector} não encontrada`)
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 }
}

/** Liga dois terminais com um fio (clique num, clique no outro). */
async function wire(page: Page, from: string, to: string) {
  const a = await anchor(page, `[data-terminal="${from}"]`)
  await page.mouse.click(a.x, a.y)
  const b = await anchor(page, `[data-terminal="${to}"]`)
  await page.mouse.click(b.x, b.y)
}

test('quadrado aberto → fio ligado → ponto de junção', async ({ page }) => {
  // R1 em (0, 0) e R2 em (4, 0).
  await page.goto('/')
  const menu = page.getByRole('complementary', { name: 'Menu de componentes' })
  await menu.getByRole('button', { name: 'Resistência' }).click()
  const box = await scene(page).boundingBox()
  if (!box) throw new Error('zona livre não encontrada')
  await menu.getByRole('button', { name: 'Resistência' }).dragTo(scene(page), {
    targetPosition: { x: box.width / 2 + sx(160), y: box.height / 2 },
  })
  await expect(scene(page).locator('[data-component-label="R2"]')).toBeVisible()

  // Sem fios: todos os pinos são quadrados abertos.
  for (const name of ['R1:a', 'R1:b', 'R2:a', 'R2:b']) {
    await expect(pin(page, name)).toHaveAttribute('data-terminal-mark', 'open')
  }

  // Um fio R1:b → R2:a: os dois pinos deixam de ter quadrado.
  await wire(page, 'R1:b', 'R2:a')
  await expect(pin(page, 'R1:b')).toHaveAttribute('data-terminal-mark', 'joined')
  await expect(pin(page, 'R2:a')).toHaveAttribute('data-terminal-mark', 'joined')
  await expect(pin(page, 'R1:a')).toHaveAttribute('data-terminal-mark', 'open')

  // Um 2.º fio em R2:a (vindo de R2:b): R2:a passa a ponto de junção (pata + 2 fios).
  await wire(page, 'R2:b', 'R2:a')
  await expect(scene(page).locator('[data-wire]')).toHaveCount(2)
  await expect(pin(page, 'R2:a')).toHaveAttribute('data-terminal-mark', 'junction')
  await expect(pin(page, 'R2:b')).toHaveAttribute('data-terminal-mark', 'joined')

  // Desfazer o 2.º fio: volta a ser um pino ligado simples.
  await page.keyboard.press('Control+z')
  await expect(pin(page, 'R2:a')).toHaveAttribute('data-terminal-mark', 'joined')
  await expect(pin(page, 'R2:b')).toHaveAttribute('data-terminal-mark', 'open')
})
