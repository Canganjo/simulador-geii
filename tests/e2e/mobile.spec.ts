import { devices, expect, test } from '@playwright/test'

// Telemóvel: ecrã, toque e "user agent" de um iPhone 13 (390 × 664), mas no Chromium
// (o motor do Safari, WebKit, não está instalado na CI).
const { viewport, userAgent, deviceScaleFactor, isMobile, hasTouch } = devices['iPhone 13']
test.use({ viewport, userAgent, deviceScaleFactor, isMobile, hasTouch })

test('telemóvel: nada sai do ecrã e a barra superior cabe', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByTestId('workspace').locator('canvas')).toBeVisible()

  // (texto em vez de função: os testes E2E não têm os tipos do DOM)
  const overflow = Number(
    await page.evaluate('document.documentElement.scrollWidth - window.innerWidth'),
  )
  expect(overflow).toBeLessThanOrEqual(0)

  // O botão de conta (canto direito da barra) está dentro do ecrã.
  const account = await page.getByRole('button', { name: /^Conta:/ }).boundingBox()
  expect(account).not.toBeNull()
  expect((account?.x ?? 0) + (account?.width ?? 0)).toBeLessThanOrEqual(viewport.width)
})

test('telemóvel: as gavetas começam fechadas e a cena fica com quase toda a largura', async ({
  page,
}) => {
  await page.goto('/')
  const menu = page.getByRole('complementary', { name: 'Menu de componentes' })
  await expect(menu.getByText('Resistência')).toBeHidden()

  const scene = await page.getByTestId('workspace').boundingBox()
  // Só as duas faixas recolhidas (48 px cada) ficam ao lado da cena.
  expect(scene?.width ?? 0).toBeGreaterThanOrEqual(viewport.width - 2 * 48 - 2)
})

test('telemóvel: abrir o menu por cima da cena; tocar num componente cria-o e fecha a gaveta', async ({
  page,
}) => {
  await page.goto('/')
  const workspace = page.getByTestId('workspace')
  const before = await workspace.boundingBox()

  await page.getByRole('button', { name: 'Abrir menu' }).tap()
  const menu = page.getByRole('complementary', { name: 'Menu de componentes' })
  await expect(menu.getByText('Resistência')).toBeVisible()
  // A gaveta tapa a cena, não a encolhe.
  expect((await workspace.boundingBox())?.width).toBeCloseTo(before?.width ?? 0, 0)

  await menu.getByRole('button', { name: /Resistência/ }).tap()
  await expect(workspace.locator('[data-component-count]')).toHaveAttribute(
    'data-component-count',
    '1',
  )
  await expect(menu.getByText('Resistência')).toBeHidden()
})

test('telemóvel: tocar no fundo escurecido fecha as propriedades', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Abrir propriedades' }).tap()
  const panel = page.getByRole('complementary', { name: 'Propriedades' })
  await expect(panel.getByText(/Seleciona um componente/)).toBeVisible()

  // O fundo cobre tudo; toca-se à esquerda, longe da gaveta (à direita) e da faixa do menu.
  await page.getByRole('button', { name: 'Fechar painel' }).tap({ position: { x: 120, y: 200 } })
  await expect(panel.getByText(/Seleciona um componente/)).toBeHidden()
})
