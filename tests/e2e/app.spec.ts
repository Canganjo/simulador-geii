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

test('puxar a borda do menu muda a largura, que se mantém ao recarregar', async ({ page }) => {
  await page.goto('/')
  const menu = page.getByRole('complementary', { name: 'Menu de componentes' })
  const handle = page.getByRole('separator', { name: 'Redimensionar menu' })
  const before = (await menu.boundingBox())?.width ?? 0
  expect(before).toBeCloseTo(240, 0)

  // Puxar a borda 100 px para a direita
  const box = await handle.boundingBox()
  if (!box) throw new Error('borda do menu não encontrada')
  const y = box.y + box.height / 2
  await page.mouse.move(box.x + box.width / 2, y)
  await page.mouse.down()
  await page.mouse.move(box.x + box.width / 2 + 100, y, { steps: 5 })
  await page.mouse.up()
  await expect.poll(async () => (await menu.boundingBox())?.width ?? 0).toBeCloseTo(340, 0)

  await page.reload()
  await expect.poll(async () => (await menu.boundingBox())?.width ?? 0).toBeCloseTo(340, 0)

  // Duplo clique → tamanho por defeito
  await page.getByRole('separator', { name: 'Redimensionar menu' }).dblclick()
  await expect.poll(async () => (await menu.boundingBox())?.width ?? 0).toBeCloseTo(240, 0)
})

test('as setas do teclado mudam o tamanho dos resultados e das propriedades', async ({ page }) => {
  await page.goto('/')
  const results = page.getByRole('region', { name: 'Resultados' })
  const props = page.getByRole('complementary', { name: 'Propriedades' })

  // Resultados: seta para cima → mais alto (16 px por tecla)
  await page.getByRole('separator', { name: 'Redimensionar resultados' }).focus()
  await page.keyboard.press('ArrowUp')
  await page.keyboard.press('ArrowUp')
  await expect.poll(async () => (await results.boundingBox())?.height ?? 0).toBeCloseTo(192, 0)

  // Propriedades (à direita): seta para a esquerda → mais largo
  await page.getByRole('separator', { name: 'Redimensionar propriedades' }).focus()
  await page.keyboard.press('ArrowLeft')
  await expect.poll(async () => (await props.boundingBox())?.width ?? 0).toBeCloseTo(272, 0)
})

test('com o painel recolhido a borda desaparece e o tamanho volta ao reabrir', async ({ page }) => {
  await page.goto('/')
  const props = page.getByRole('complementary', { name: 'Propriedades' })
  await page.getByRole('separator', { name: 'Redimensionar propriedades' }).focus()
  await page.keyboard.press('End') // máximo: 520 px
  await expect.poll(async () => (await props.boundingBox())?.width ?? 0).toBeCloseTo(520, 0)

  await page.getByRole('button', { name: 'Recolher propriedades' }).click()
  await expect(page.getByRole('separator', { name: 'Redimensionar propriedades' })).toHaveCount(0)

  await page.getByRole('button', { name: 'Abrir propriedades' }).click()
  await expect.poll(async () => (await props.boundingBox())?.width ?? 0).toBeCloseTo(520, 0)
})

test('Desfazer e Refazer estão desativados no início', async ({ page }) => {
  await page.goto('/')
  const actions = page.getByRole('navigation', { name: 'Ações' })
  await expect(actions.getByRole('button', { name: 'Desfazer' })).toBeDisabled()
  await expect(actions.getByRole('button', { name: 'Refazer' })).toBeDisabled()
})
