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
