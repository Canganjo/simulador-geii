import { expect, test, type Page } from '@playwright/test'

/**
 * Barras de deslocamento da zona livre: a horizontal (em baixo) leva a vista para a esquerda ou
 * para a direita; a vertical (à direita) para cima ou para baixo. Os componentes ficam no mesmo
 * sítio do esquema: é a vista que anda, por isso no ecrã eles andam para o lado contrário.
 */

const scene = (page: Page) => page.getByTestId('workspace')
const menu = (page: Page) => page.getByRole('complementary', { name: 'Menu de componentes' })

async function labelCenter(page: Page, name: string) {
  const box = await scene(page).locator(`[data-component-label="${name}"]`).boundingBox()
  if (!box) throw new Error(`etiqueta ${name} não encontrada`)
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 }
}

async function thumbCenter(page: Page, axis: 'x' | 'z') {
  const box = await page.locator(`[data-scrollbar="${axis}"] [data-scrollbar-thumb]`).boundingBox()
  if (!box) throw new Error(`cursor da barra ${axis} não encontrado`)
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 }
}

test('barra horizontal: arrastar para a direita leva os componentes para a esquerda', async ({
  page,
}) => {
  await page.goto('/')
  await menu(page).getByRole('button', { name: 'Resistência' }).click()
  const bar = page.getByRole('scrollbar', { name: /esquerda ou para a direita/ })
  await expect(bar).toBeVisible()
  const before = await labelCenter(page, 'R1')
  const value = Number(await bar.getAttribute('aria-valuenow'))

  const t = await thumbCenter(page, 'x')
  await page.mouse.move(t.x, t.y)
  await page.mouse.down()
  await page.mouse.move(t.x + 40, t.y, { steps: 5 })
  await page.mouse.up()

  await expect.poll(async () => (await labelCenter(page, 'R1')).x).toBeLessThan(before.x - 20)
  // Só andou na horizontal.
  expect(Math.abs((await labelCenter(page, 'R1')).y - before.y)).toBeLessThan(1)
  expect(Number(await bar.getAttribute('aria-valuenow'))).toBeGreaterThan(value)

  // Com a barra focada, a seta para a esquerda traz a vista de volta (2 quadrados por tecla).
  const moved = (await labelCenter(page, 'R1')).x
  await bar.focus()
  await page.keyboard.press('ArrowLeft')
  await expect.poll(async () => (await labelCenter(page, 'R1')).x).toBeGreaterThan(moved + 20)
})

test('barra vertical: clique na calha por baixo do cursor leva os componentes para cima', async ({
  page,
}) => {
  await page.goto('/')
  await menu(page).getByRole('button', { name: 'Resistência' }).click()
  const bar = page.getByRole('scrollbar', { name: /cima ou para baixo/ })
  const before = await labelCenter(page, 'R1')

  const track = await bar.boundingBox()
  const thumb = await page.locator('[data-scrollbar="z"] [data-scrollbar-thumb]').boundingBox()
  if (!track || !thumb) throw new Error('barra vertical não encontrada')
  // Um ponto da calha entre o fim do cursor e o fim da barra.
  const y = (thumb.y + thumb.height + track.y + track.height) / 2
  await page.mouse.click(track.x + track.width / 2, y)

  await expect.poll(async () => (await labelCenter(page, 'R1')).y).toBeLessThan(before.y - 20)
  expect(Math.abs((await labelCenter(page, 'R1')).x - before.x)).toBeLessThan(1)
})
