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

test('a pesquisa filtra os componentes', async ({ page }) => {
  await page.goto('/')
  const menu = page.getByRole('complementary', { name: 'Menu de componentes' })
  await menu.getByPlaceholder('Pesquisar…').fill('lâmp')
  await expect(menu.getByText('Lâmpada')).toBeVisible()
  await expect(menu.getByText('Resistência')).toBeHidden()
})
