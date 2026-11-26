import { expect, test, type Page } from '@playwright/test'
import { sx, sy } from './grelha.ts'

/**
 * Com a resistência na vertical (90° ou 270°), o pino de trás fica atrás do corpo visto pela
 * câmara inclinada. O clique nesse pino tem de ligar o fio (antes ia para o corpo e não ligava).
 */

const scene = (page: Page) => page.getByTestId('workspace')
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

const wireCount = async (page: Page) =>
  Number(await scene(page).locator('[data-wire-count]').getAttribute('data-wire-count'))

for (const turns of [1, 3]) {
  test(`resistência rodada ${turns * 90}°: os dois pinos ligam-se`, async ({ page }) => {
    await page.goto('/')
    // A fonte primeiro: selecionada, teria os botões − / + por cima dos bornes.
    await dropAt(page, 'Fonte DC', -160, 0)
    await dropAt(page, 'GND', 160, 120)
    await dropAt(page, 'Resistência', 0, 0)
    for (let i = 0; i < turns; i++) await page.keyboard.press('r')
    await expect(page.getByTestId('selected-rotation')).toHaveText(`${turns * 90}°`)

    // Os dois pinos da resistência, um deles escondido atrás do corpo.
    await connect(page, 'R1:a', 'V1:+')
    await expect.poll(() => wireCount(page)).toBe(1)
    await connect(page, 'R1:b', 'GND1:gnd')
    await expect.poll(() => wireCount(page)).toBe(2)
    // E também como 2.º clique (fio que acaba no pino de trás).
    await connect(page, 'V1:-', 'R1:a')
    await connect(page, 'V1:-', 'R1:b')
    await expect.poll(() => wireCount(page)).toBe(4)
  })
}
