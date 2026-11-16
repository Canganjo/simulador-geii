import { expect, test } from '@playwright/test'

/** Menu de componentes com ícones (mosaicos, valor por omissão, coluna de ícones ao recolher). */

const menu = (page: import('@playwright/test').Page) =>
  page.getByRole('complementary', { name: 'Menu de componentes' })

test('cada componente mostra o ícone e o valor por omissão', async ({ page }) => {
  await page.goto('/')
  const source = menu(page).getByRole('button', { name: 'Fonte DC', exact: true })
  await expect(source).toContainText('12 V · 3 A')
  await expect(menu(page).getByRole('button', { name: 'Resistência', exact: true })).toContainText(
    '1 kΩ',
  )
  await expect(menu(page).getByRole('button', { name: 'Condensador', exact: true })).toContainText(
    '100 µF',
  )
  // O símbolo IEC está dentro do botão.
  await expect(source.locator('svg')).toHaveCount(1)
})

test('menu recolhido: fica uma coluna de ícones que também cria componentes', async ({ page }) => {
  await page.goto('/')
  await menu(page).getByRole('button', { name: 'Recolher menu' }).click()
  const rail = menu(page).locator('[data-menu-rail]')
  await expect(rail).toBeVisible()
  // Um ícone por tipo do catálogo (9), sem a pesquisa nem os nomes à vista.
  await expect(rail.locator('[data-menu-item]')).toHaveCount(9)
  await expect(menu(page).getByPlaceholder('Pesquisar…')).toHaveCount(0)

  await rail.getByRole('button', { name: 'Resistência', exact: true }).click()
  await expect(page.getByTestId('workspace').locator('[data-component-label="R1"]')).toBeVisible()

  await menu(page).getByRole('button', { name: 'Abrir menu' }).click()
  await expect(menu(page).getByPlaceholder('Pesquisar…')).toBeVisible()
})
