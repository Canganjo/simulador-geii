import { expect, test } from '@playwright/test'

test('a app abre e mostra o título', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveTitle(/Simulador 2\.5D/)
})

test('o layout tem as 5 zonas e a cena 3D desenha num canvas', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('banner')).toBeVisible() // barra superior
  await expect(page.getByRole('complementary', { name: 'Menu de componentes' })).toBeVisible()
  await expect(page.getByRole('complementary', { name: 'Propriedades' })).toBeVisible()
  await expect(page.getByRole('region', { name: 'Resultados' })).toBeVisible()
  await expect(page.getByTestId('workspace').locator('canvas')).toBeVisible()
})

test('o menu de componentes recolhe e volta a abrir', async ({ page }) => {
  await page.goto('/')
  const menu = page.getByRole('complementary', { name: 'Menu de componentes' })
  await expect(menu.getByText('Resistência')).toBeVisible()

  await menu.getByRole('button', { name: 'Recolher menu' }).click()
  await expect(menu.getByText('Resistência')).toBeHidden()

  await menu.getByRole('button', { name: 'Abrir menu' }).click()
  await expect(menu.getByText('Resistência')).toBeVisible()
})

test('o painel de propriedades recolhe e volta a abrir', async ({ page }) => {
  await page.goto('/')
  const panel = page.getByRole('complementary', { name: 'Propriedades' })
  const text = panel.getByText('Seleciona um componente')
  await expect(text).toBeVisible()

  await panel.getByRole('button', { name: 'Recolher propriedades' }).click()
  await expect(text).toBeHidden()

  await panel.getByRole('button', { name: 'Abrir propriedades' }).click()
  await expect(text).toBeVisible()
})

test('o painel de resultados recolhe e volta a abrir', async ({ page }) => {
  await page.goto('/')
  const panel = page.getByRole('region', { name: 'Resultados' })
  const text = panel.getByText('para ver a tensão (U)')
  await expect(text).toBeVisible()

  await panel.getByRole('button', { name: 'Recolher resultados' }).click()
  await expect(text).toBeHidden()
  await expect(panel.getByRole('heading', { name: 'Resultados' })).toBeVisible() // o cabeçalho fica

  await panel.getByRole('button', { name: 'Abrir resultados' }).click()
  await expect(text).toBeVisible()
})

test('a cena ocupa o espaço libertado pelos painéis recolhidos', async ({ page }) => {
  await page.goto('/')
  const scene = page.getByTestId('workspace')
  const before = await scene.boundingBox()

  await page.getByRole('button', { name: 'Recolher menu' }).click()
  await page.getByRole('button', { name: 'Recolher propriedades' }).click()
  await page.getByRole('button', { name: 'Recolher resultados' }).click()

  // Os painéis têm uma pequena animação: espera até a cena crescer.
  await expect
    .poll(async () => (await scene.boundingBox())?.width ?? 0)
    .toBeGreaterThan((before?.width ?? 0) + 300) // menu 240→48 + propriedades 256→48 ≈ +400 px
  await expect
    .poll(async () => (await scene.boundingBox())?.height ?? 0)
    .toBeGreaterThan((before?.height ?? 0) + 100) // resultados 160→36 ≈ +124 px
})

test('o estado dos painéis mantém-se ao recarregar a página', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Recolher propriedades' }).click()
  await page.reload()
  await expect(page.getByRole('button', { name: 'Abrir propriedades' })).toBeVisible()
})

test('o botão de conta mostra as iniciais e permite mudar o nome', async ({ page }) => {
  await page.goto('/')
  const account = page.getByRole('button', { name: 'Conta: Convidado' })
  await expect(account).toContainText('CO')

  await account.click()
  const menu = page.getByRole('menu', { name: 'Menu da conta' })
  await expect(menu).toBeVisible()
  await expect(menu).toContainText('@Convidado')
  await expect(menu.getByRole('menuitem', { name: 'Terminar sessão' })).toBeVisible()
  await menu.getByRole('button', { name: 'Mudar o nome' }).click()
  await menu.getByLabel('Nome').fill('Ana Maria Silva')
  await menu.getByRole('button', { name: 'Guardar' }).click()

  await page.keyboard.press('Escape')
  await expect(menu).toBeHidden()
  await expect(page.getByRole('button', { name: 'Conta: Ana Maria Silva' })).toContainText('AS')
})

test('a pesquisa filtra os componentes', async ({ page }) => {
  await page.goto('/')
  const menu = page.getByRole('complementary', { name: 'Menu de componentes' })
  await menu.getByPlaceholder('Pesquisar…').fill('lâmp')
  await expect(menu.getByText('Lâmpada')).toBeVisible()
  await expect(menu.getByText('Resistência')).toBeHidden()
})
