import { expect, test, type Page } from '@playwright/test'

/**
 * Selecionar vários componentes e apagá-los de uma vez (issue #54):
 * retângulo com o rato (ou touchpad: tocar duas vezes e arrastar), Ctrl+clique, Ctrl+A, Delete.
 */

test.setTimeout(90_000)

const scene = (page: Page) => page.getByTestId('workspace')
const props = (page: Page) => page.getByRole('complementary', { name: 'Propriedades' })
const label = (page: Page, name: string) => scene(page).locator(`[data-component-label="${name}"]`)
const count = async (page: Page) =>
  Number(await scene(page).locator('[data-component-count]').getAttribute('data-component-count'))

async function center(page: Page) {
  const box = await scene(page).boundingBox()
  if (!box) throw new Error('zona livre não encontrada')
  return { x: box.x + box.width / 2, y: box.y + box.height / 2, box }
}

/** R1 no centro, R2 160 px à direita, R3 160 px à esquerda. */
async function threeResistors(page: Page) {
  await page.goto('/')
  const menu = page.getByRole('complementary', { name: 'Menu de componentes' })
  await menu.getByRole('button', { name: 'Resistência' }).click()
  const { box } = await center(page)
  for (const dx of [160, -160]) {
    await menu.getByRole('button', { name: 'Resistência' }).dragTo(scene(page), {
      targetPosition: { x: box.width / 2 + dx, y: box.height / 2 },
    })
  }
  await expect(label(page, 'R3')).toBeVisible()
  expect(await count(page)).toBe(3)
}

/** Ponto do ecrã no centro de um componente (a meio dos seus dois terminais). */
async function componentPoint(page: Page, name: string) {
  const a = await scene(page).locator(`[data-terminal="${name}:a"]`).boundingBox()
  const b = await scene(page).locator(`[data-terminal="${name}:b"]`).boundingBox()
  if (!a || !b) throw new Error(`terminais de ${name} não encontrados`)
  return { x: (a.x + b.x) / 2 + a.width / 2, y: (a.y + b.y) / 2 + a.height / 2 }
}

test('retângulo com o rato: seleciona R1 e R2; Delete apaga os dois; Ctrl+Z repõe', async ({
  page,
}) => {
  await threeResistors(page)
  const c = await center(page)

  // Arrastar no VAZIO (botão esquerdo) de cima-esquerda de R1 até baixo-direita de R2.
  await page.mouse.move(c.x - 60, c.y - 70)
  await page.mouse.down()
  await page.mouse.move(c.x + 60, c.y, { steps: 5 })
  await page.mouse.move(c.x + 230, c.y + 60, { steps: 5 })
  await expect(page.getByTestId('selection-box')).toBeVisible()
  await page.mouse.up()
  await expect(page.getByTestId('selection-box')).toHaveCount(0)

  await expect(label(page, 'R1')).toHaveAttribute('data-selected', 'true')
  await expect(label(page, 'R2')).toHaveAttribute('data-selected', 'true')
  await expect(label(page, 'R3')).toHaveAttribute('data-selected', 'false')
  await expect(props(page).getByTestId('multi-selection')).toContainText(
    '2 componentes selecionados',
  )

  await page.keyboard.press('Delete')
  expect(await count(page)).toBe(1)
  await expect(label(page, 'R3')).toBeVisible()

  await page.keyboard.press('Control+z') // um só passo repõe os dois
  await expect.poll(() => count(page)).toBe(3)
})

test('arrastar da direita para a esquerda também seleciona', async ({ page }) => {
  await threeResistors(page)
  const c = await center(page)
  await page.mouse.move(c.x + 60, c.y + 60)
  await page.mouse.down()
  await page.mouse.move(c.x - 230, c.y - 70, { steps: 8 })
  await page.mouse.up()
  await expect(label(page, 'R1')).toHaveAttribute('data-selected', 'true')
  await expect(label(page, 'R3')).toHaveAttribute('data-selected', 'true')
  await expect(label(page, 'R2')).toHaveAttribute('data-selected', 'false')
})

test('Ctrl+clique junta e tira; clique no vazio tira tudo', async ({ page }) => {
  await threeResistors(page)
  const p1 = await componentPoint(page, 'R1')
  const p2 = await componentPoint(page, 'R2')
  await page.mouse.click(p1.x, p1.y)
  await page.keyboard.down('Control')
  await page.mouse.click(p2.x, p2.y)
  await page.keyboard.up('Control')
  await expect(label(page, 'R1')).toHaveAttribute('data-selected', 'true')
  await expect(label(page, 'R2')).toHaveAttribute('data-selected', 'true')
  await expect(props(page).getByTestId('multi-selection')).toContainText('R1')

  await page.keyboard.down('Control')
  await page.mouse.click(p1.x, p1.y) // tira R1
  await page.keyboard.up('Control')
  await expect(label(page, 'R1')).toHaveAttribute('data-selected', 'false')
  await expect(props(page).getByTestId('selected-name')).toHaveText('R2')

  const c = await center(page)
  await page.mouse.click(c.x, c.y + 150) // vazio
  await expect(label(page, 'R2')).toHaveAttribute('data-selected', 'false')
})

test('Ctrl+A seleciona tudo e o botão "Apagar os 3" apaga tudo', async ({ page }) => {
  await threeResistors(page)
  await page.keyboard.press('Control+a')
  await expect(props(page).getByTestId('multi-selection')).toContainText(
    '3 componentes selecionados',
  )
  await props(page).getByRole('button', { name: 'Apagar os 3' }).click()
  expect(await count(page)).toBe(0)
})
