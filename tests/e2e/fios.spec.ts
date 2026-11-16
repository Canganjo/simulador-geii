import { expect, test, type Page } from '@playwright/test'
import { sx, sy } from './grelha.ts'

/**
 * Organizar os fios (como no Tinkercad): arrastar um troço do fio para cima/baixo ou para os
 * lados; Desfazer; "Endireitar fio" no painel e com duplo clique.
 */

test.setTimeout(90_000)

const scene = (page: Page) => page.getByTestId('workspace')
const props = (page: Page) => page.getByRole('complementary', { name: 'Propriedades' })

/** Centro (em píxeis) de um elemento âncora da cena. */
async function anchor(page: Page, selector: string) {
  const box = await scene(page).locator(selector).boundingBox()
  if (!box) throw new Error(`âncora ${selector} não encontrada`)
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 }
}

/** Traçado do fio (pontos da grelha "x,y" separados por espaços), lido da 1.ª âncora. */
async function points(page: Page) {
  return scene(page).locator('[data-wire]').first().getAttribute('data-points')
}

/**
 * R1 em (0, 0) e R2 em (4, 0), ligados por um fio R1:b (1, 0) → R2:a (3, 0): uma linha reta.
 */
async function wiredResistors(page: Page) {
  await page.goto('/')
  const menu = page.getByRole('complementary', { name: 'Menu de componentes' })
  await menu.getByRole('button', { name: 'Resistência' }).click()
  const box = await scene(page).boundingBox()
  if (!box) throw new Error('zona livre não encontrada')
  await menu.getByRole('button', { name: 'Resistência' }).dragTo(scene(page), {
    targetPosition: { x: box.width / 2 + sx(160), y: box.height / 2 },
  })
  await expect(scene(page).locator('[data-component-label="R2"]')).toBeVisible()
  const a = await anchor(page, '[data-terminal="R1:b"]')
  await page.mouse.click(a.x, a.y)
  const b = await anchor(page, '[data-terminal="R2:a"]')
  await page.mouse.click(b.x, b.y)
  await expect(scene(page).locator('[data-wire]')).toHaveCount(1)
  expect(await points(page)).toBe('1,0 3,0')
}

/** Arrasta o troço `index` do fio `dy` píxeis na vertical (negativo = para cima). */
async function dragSegment(page: Page, index: number, dy: number) {
  const id = await scene(page).locator('[data-wire]').first().getAttribute('data-wire')
  const start = await anchor(page, `[data-wire-segment="${id}:${index}"]`)
  await page.mouse.move(start.x, start.y)
  await page.mouse.down()
  await page.mouse.move(start.x, start.y + sy(dy) / 2, { steps: 4 })
  await page.mouse.move(start.x, start.y + sy(dy), { steps: 4 })
  await page.mouse.up()
}

test('arrastar o fio para cima → "U" com os terminais no sítio; Ctrl+Z / Ctrl+Y', async ({
  page,
}) => {
  await wiredResistors(page)

  await dragSegment(page, 0, -90)
  // O troço subiu algumas células; as pontas continuam nos terminais (1,0) e (3,0).
  const bent = await points(page)
  expect(bent).toMatch(/^1,0 1,([1-9]) 3,\1 3,0$/)
  // O fio ficou selecionado e o painel mostra as opções do fio.
  await expect(props(page).getByTestId('wire-selection')).toBeVisible()
  await expect(scene(page).locator('[data-wire]')).toHaveAttribute('data-selected', 'true')
  // Os terminais continuam ligados (o circuito não mudou, só o desenho).
  await expect(scene(page).locator('[data-terminal="R2:a"]')).toHaveAttribute(
    'data-terminal-state',
    'connected',
  )

  // Um arrasto = um só passo de Desfazer.
  await page.keyboard.press('Control+z')
  expect(await points(page)).toBe('1,0 3,0')
  await page.keyboard.press('Control+y')
  expect(await points(page)).toBe(bent)

  // Arrastar o troço do meio (agora horizontal, no topo) ainda mais para cima: continua um "U".
  await dragSegment(page, 1, -40)
  expect(await points(page)).toMatch(/^1,0 1,(\d) 3,\1 3,0$/)
  expect(await points(page)).not.toBe(bent)
})

test('"Endireitar fio" no painel e duplo clique voltam ao traçado automático', async ({ page }) => {
  await wiredResistors(page)
  await dragSegment(page, 0, -90)
  expect(await points(page)).not.toBe('1,0 3,0')

  const straighten = props(page).getByRole('button', { name: 'Endireitar fio' })
  await expect(straighten).toBeEnabled()
  await straighten.click()
  expect(await points(page)).toBe('1,0 3,0')
  await expect(straighten).toBeDisabled()

  // Outra vez, agora com duplo clique no troço do meio.
  await dragSegment(page, 0, -90)
  const id = await scene(page).locator('[data-wire]').first().getAttribute('data-wire')
  const middle = await anchor(page, `[data-wire-segment="${id}:1"]`)
  await page.mouse.dblclick(middle.x, middle.y)
  expect(await points(page)).toBe('1,0 3,0')

  // Apagar o fio pelo painel.
  await props(page).getByRole('button', { name: 'Apagar fio' }).click()
  await expect(scene(page).locator('[data-wire]')).toHaveCount(0)
})
