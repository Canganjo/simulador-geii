import { expect, test } from '@playwright/test'
import { sx, sy } from './grelha.ts'

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

test('arrastar uma resistência para a zona livre cria 1 componente (R1)', async ({ page }) => {
  await page.goto('/')
  const scene = page.getByTestId('workspace')
  const menu = page.getByRole('complementary', { name: 'Menu de componentes' })
  const labels = scene.locator('[data-component-label]')
  await expect(labels).toHaveCount(0)

  await menu.getByRole('button', { name: 'Resistência' }).dragTo(scene)
  await expect(labels).toHaveCount(1)
  await expect(scene.locator('[data-component-label="R1"]')).toBeVisible()

  // Criação ilimitada: outra resistência → R2
  await menu
    .getByRole('button', { name: 'Resistência' })
    .dragTo(scene, { targetPosition: { x: 120, y: 120 } })
  await expect(labels).toHaveCount(2)
  await expect(scene.locator('[data-component-label="R2"]')).toBeVisible()

  // Desfazer (#4) → o R2 desaparece
  await page.getByRole('button', { name: 'Desfazer' }).click()
  await expect(labels).toHaveCount(1)
  await expect(scene.locator('[data-component-label="R2"]')).toHaveCount(0)
})

test('clicar num item do menu cria o componente no centro da vista', async ({ page }) => {
  await page.goto('/')
  const scene = page.getByTestId('workspace')
  const menu = page.getByRole('complementary', { name: 'Menu de componentes' })
  await menu.getByRole('button', { name: 'Fonte DC' }).click()
  await menu.getByRole('button', { name: 'Fonte DC' }).click()
  await expect(scene.locator('[data-component-label="V1"]')).toBeVisible()
  await expect(scene.locator('[data-component-label="V2"]')).toBeVisible()
})

/** Cria um componente com um clique no menu: fica no centro da cena, em (0, 0). */
async function addAtCenter(page: import('@playwright/test').Page, item: string) {
  await page
    .getByRole('complementary', { name: 'Menu de componentes' })
    .getByRole('button', { name: item })
    .click()
}

/** Centro da zona livre, em píxeis do ecrã. */
async function sceneCenter(page: import('@playwright/test').Page) {
  const box = await page.getByTestId('workspace').boundingBox()
  if (!box) throw new Error('zona livre não encontrada')
  return { x: box.x + box.width / 2, y: box.y + box.height / 2, box }
}

test('selecionar: clique no componente mostra-o nas propriedades; clique no vazio tira', async ({
  page,
}) => {
  await page.goto('/')
  await addAtCenter(page, 'Resistência')
  const props = page.getByRole('complementary', { name: 'Propriedades' })
  const { x, y, box } = await sceneCenter(page)

  await page.mouse.click(box.x + 20, box.y + 20) // vazio
  await expect(props.getByText('Seleciona um componente')).toBeVisible()

  await page.mouse.click(x, y) // em cima do R1
  await expect(props.getByTestId('selected-name')).toHaveText('R1')
  await expect(props).toContainText('Resistência')
  await expect(props.getByRole('textbox', { name: 'Resistência', exact: true })).toHaveValue('1k')
})

test('mover: arrastar o componente muda a posição; Ctrl+Z volta atrás num só passo', async ({
  page,
}) => {
  await page.goto('/')
  await addAtCenter(page, 'Resistência')
  const props = page.getByRole('complementary', { name: 'Propriedades' })
  const position = props.getByTestId('selected-position')
  await expect(position).toHaveText('(0, 0)')

  const { x, y } = await sceneCenter(page)
  await page.mouse.move(x, y)
  await page.mouse.down()
  await page.mouse.move(x + sx(80), y, { steps: 8 }) // 2 células
  await page.mouse.up()
  await expect(position).toHaveText('(2, 0)')

  await page.keyboard.press('Control+z')
  await expect(position).toHaveText('(0, 0)')
})

test('apagar com Delete e voltar com Ctrl+Z; rodar com R; duplicar com Ctrl+D', async ({
  page,
}) => {
  await page.goto('/')
  await addAtCenter(page, 'Resistência')
  const scene = page.getByTestId('workspace')
  const props = page.getByRole('complementary', { name: 'Propriedades' })

  await page.keyboard.press('r')
  await expect(props.getByTestId('selected-rotation')).toHaveText('90°')

  await page.keyboard.press('Control+d')
  await expect(scene.locator('[data-component-label="R2"]')).toBeVisible()
  await expect(props.getByTestId('selected-name')).toHaveText('R2')

  await page.keyboard.press('Delete')
  await expect(scene.locator('[data-component-label="R2"]')).toHaveCount(0)
  await expect(props.getByText('Seleciona um componente')).toBeVisible()

  await page.keyboard.press('Control+z')
  await expect(scene.locator('[data-component-label="R2"]')).toBeVisible()
})

/** Centro (em píxeis) de um elemento âncora da cena, ex.: o terminal "R1:b". */
async function anchor(page: import('@playwright/test').Page, selector: string) {
  const box = await page.getByTestId('workspace').locator(selector).boundingBox()
  if (!box) throw new Error(`âncora ${selector} não encontrada`)
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 }
}

/** R1 em (0, 0) (clique no menu) e R2 em (4, 0) (arrastado 160 px para a direita do centro). */
async function twoResistors(page: import('@playwright/test').Page) {
  await page.goto('/')
  const menu = page.getByRole('complementary', { name: 'Menu de componentes' })
  const scene = page.getByTestId('workspace')
  await menu.getByRole('button', { name: 'Resistência' }).click()
  const box = await scene.boundingBox()
  if (!box) throw new Error('zona livre não encontrada')
  await menu.getByRole('button', { name: 'Resistência' }).dragTo(scene, {
    targetPosition: { x: box.width / 2 + 160, y: box.height / 2 },
  })
  await expect(scene.locator('[data-component-label="R2"]')).toBeVisible()
  return scene
}

/** Liga dois terminais com dois cliques. */
async function connect(page: import('@playwright/test').Page, from: string, to: string) {
  const a = await anchor(page, `[data-terminal="${from}"]`)
  await page.mouse.click(a.x, a.y)
  await expect(page.getByRole('status')).toContainText(`A ligar ${from}`)
  const b = await anchor(page, `[data-terminal="${to}"]`)
  await page.mouse.click(b.x, b.y)
}

test('fios: ligar dois terminais; os terminais ficam "ligados"', async ({ page }) => {
  const scene = await twoResistors(page)
  await connect(page, 'R1:b', 'R2:a')
  await expect(scene.locator('[data-wire-count]')).toHaveAttribute('data-wire-count', '1')
  await expect(scene.locator('[data-terminal="R1:b"]')).toHaveAttribute(
    'data-terminal-state',
    'connected',
  )
  await expect(scene.locator('[data-terminal="R1:a"]')).toHaveAttribute(
    'data-terminal-state',
    'loose',
  )
})

test('fios: o fio segue o componente quando este se move', async ({ page }) => {
  const scene = await twoResistors(page)
  await connect(page, 'R1:b', 'R2:a')
  const before = await anchor(page, '[data-terminal="R2:a"]')

  // Agarra o R2 pelo centro (a meio dos seus dois terminais) e arrasta 80 px para a direita.
  const b = await anchor(page, '[data-terminal="R2:b"]')
  const center = { x: (before.x + b.x) / 2, y: (before.y + b.y) / 2 }
  await page.mouse.move(center.x, center.y)
  await page.mouse.down()
  await page.mouse.move(center.x + sx(80), center.y, { steps: 8 })
  await page.mouse.up()

  await expect
    .poll(async () => (await anchor(page, '[data-terminal="R2:a"]')).x)
    .toBeGreaterThan(before.x + 60)
  await expect(scene.locator('[data-wire-count]')).toHaveAttribute('data-wire-count', '1')
  await expect(scene.locator('[data-terminal="R2:a"]')).toHaveAttribute(
    'data-terminal-state',
    'connected',
  )
})

test('fios: selecionar e apagar com Delete; Ctrl+Z repõe', async ({ page }) => {
  const scene = await twoResistors(page)
  await connect(page, 'R1:b', 'R2:a')
  const wire = scene.locator('[data-wire]')
  const w = await anchor(page, '[data-wire]')
  await page.mouse.click(w.x, w.y)
  await expect(wire).toHaveAttribute('data-selected', 'true')

  await page.keyboard.press('Delete')
  await expect(scene.locator('[data-wire-count]')).toHaveAttribute('data-wire-count', '0')
  await expect(scene.locator('[data-component-label="R1"]')).toBeVisible() // só o fio saiu

  await page.keyboard.press('Control+z')
  await expect(scene.locator('[data-wire-count]')).toHaveAttribute('data-wire-count', '1')
})

test('fios: Esc a meio cancela sem criar fio', async ({ page }) => {
  const scene = await twoResistors(page)
  const a = await anchor(page, '[data-terminal="R1:a"]')
  await page.mouse.click(a.x, a.y)
  await expect(page.getByRole('status')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('status')).toHaveCount(0)
  await expect(scene.locator('[data-wire-count]')).toHaveAttribute('data-wire-count', '0')
})

test('idioma: o interruptor PT · FR · EN do menu da conta muda a app e fica guardado', async ({
  page,
}) => {
  await page.goto('/')
  await page.getByRole('button', { name: /^Conta:/ }).click()
  const languages = page.getByRole('radiogroup', { name: 'Idioma' })
  await expect(languages.getByRole('radio', { name: 'Português' })).toBeChecked()

  // English
  await languages.getByRole('radio', { name: 'English' }).click()
  await expect(page.locator('html')).toHaveAttribute('lang', 'en')
  await expect(page.getByRole('complementary', { name: 'Components menu' })).toContainText(
    'Resistor',
  )
  await expect(page.getByRole('button', { name: 'Simulate' })).toBeVisible()

  // Français — e continua depois de recarregar a página
  await page
    .getByRole('radiogroup', { name: 'Language' })
    .getByRole('radio', { name: 'Français' })
    .click()
  await page.reload()
  await expect(page.locator('html')).toHaveAttribute('lang', 'fr')
  await expect(page.getByRole('complementary', { name: 'Menu des composants' })).toContainText(
    'Résistance',
  )
})

/** Arrasta um item do menu para a zona livre, a (dx, dy) píxeis do centro. */
async function dropAt(page: import('@playwright/test').Page, item: string, dx: number, dy: number) {
  const menu = page.getByRole('complementary', { name: 'Menu de componentes' })
  const scene = page.getByTestId('workspace')
  const box = await scene.boundingBox()
  if (!box) throw new Error('zona livre não encontrada')
  await menu.getByRole('button', { name: item }).dragTo(scene, {
    targetPosition: { x: box.width / 2 + sx(dx), y: box.height / 2 + sy(dy) },
  })
}

test('simular: V1 (12 V) + R1 (1 kΩ) + GND → I = 12 mA na tabela; mexer limpa', async ({
  page,
}) => {
  //   V1+ ── R1:a   R1:b ── GND1 ── V1−      I = 12 V / 1000 Ω = 12 mA ; P(R1) = 12 × 0,012 = 144 mW
  await page.goto('/')
  const scene = page.getByTestId('workspace')
  await page
    .getByRole('complementary', { name: 'Menu de componentes' })
    .getByRole('button', { name: 'Resistência' })
    .click() // R1 no centro
  await dropAt(page, 'Fonte DC', -160, 0) // V1 à esquerda
  await dropAt(page, 'GND', 0, 120) // GND1 em baixo
  await expect(scene.locator('[data-component-label="GND1"]')).toBeVisible()

  await connect(page, 'V1:+', 'R1:a')
  await connect(page, 'R1:b', 'GND1:gnd')
  await connect(page, 'GND1:gnd', 'V1:-')
  await expect(scene.locator('[data-wire-count]')).toHaveAttribute('data-wire-count', '3')

  await page.getByRole('button', { name: 'Simular' }).click()
  const row = page.getByRole('region', { name: 'Resultados' }).locator('tr[data-component="R1"]')
  await expect(row).toContainText('12 V')
  await expect(row).toContainText('12 mA')
  await expect(row).toContainText('1 kΩ')
  await expect(row).toContainText('144 mW')

  // Mexer no circuito (Ctrl+Z tira o último fio) → os resultados desaparecem.
  await page.keyboard.press('Control+z')
  await expect(page.getByTestId('results-table')).toHaveCount(0)
})

test('simular: só uma resistência → erros "sem fonte" e "falta o GND"; em inglês também', async ({
  page,
}) => {
  await page.goto('/')
  await page
    .getByRole('complementary', { name: 'Menu de componentes' })
    .getByRole('button', { name: 'Resistência' })
    .click()
  await page.getByRole('button', { name: 'Simular' }).click()
  const results = page.getByRole('region', { name: 'Resultados' })
  await expect(results).toContainText('Não há nenhuma fonte de tensão no circuito.')
  await expect(results).toContainText('Falta o GND')
  await expect(results.locator('[data-severity="error"]')).toHaveCount(2)

  await page.getByRole('button', { name: /^Conta:/ }).click()
  await page.getByRole('radio', { name: 'English' }).click()
  await expect(page.getByRole('region', { name: 'Results' })).toContainText(
    'There is no voltage source in the circuit.',
  )
})

test('editar: teste 6 da planilha montado pela interface (12 V, 470 Ω, LED) → 21,3 mA', async ({
  page,
}) => {
  //   V1+ ── R1 ── D1 (ânodo → cátodo) ── GND1 ── V1−
  //   I = (12 − 2) / 470 = 21,28 mA ; U(R1) = 470 × 0,02128 = 10 V
  await page.goto('/')
  const props = page.getByRole('complementary', { name: 'Propriedades' })
  await page
    .getByRole('complementary', { name: 'Menu de componentes' })
    .getByRole('button', { name: 'Resistência' })
    .click() // R1 no centro, já selecionado
  const resistance = props.getByRole('textbox', { name: 'Resistência', exact: true })
  await resistance.fill('470')
  await resistance.press('Enter')
  await expect(resistance).toHaveValue('470')

  await dropAt(page, 'Fonte DC', -160, 0)
  await dropAt(page, 'LED', 160, 0)
  await dropAt(page, 'GND', 0, 120)
  await connect(page, 'V1:+', 'R1:a')
  await connect(page, 'R1:b', 'D1:anodo')
  await connect(page, 'D1:catodo', 'GND1:gnd')
  await connect(page, 'GND1:gnd', 'V1:-')

  await page.getByRole('button', { name: 'Simular' }).click()
  const results = page.getByRole('region', { name: 'Resultados' })
  await expect(results.locator('tr[data-component="R1"]')).toContainText('21,3 mA')
  await expect(results.locator('tr[data-component="R1"]')).toContainText('470 Ω')
  await expect(results.locator('tr[data-component="D1"]')).toContainText('aceso')
})

test('editar: valor inválido fica a vermelho e não muda; Ctrl+Z desfaz um valor; nome', async ({
  page,
}) => {
  await page.goto('/')
  const props = page.getByRole('complementary', { name: 'Propriedades' })
  await page
    .getByRole('complementary', { name: 'Menu de componentes' })
    .getByRole('button', { name: 'Resistência' })
    .click()
  const resistance = props.getByRole('textbox', { name: 'Resistência', exact: true })

  await resistance.fill('abc')
  await resistance.press('Enter')
  await expect(props.getByRole('alert')).toContainText('Escreve um número')

  await resistance.fill('0')
  await resistance.press('Enter')
  await expect(props.getByRole('alert')).toContainText('Tem de estar entre 1 mΩ e 100 MΩ')

  await resistance.fill('4k7')
  await resistance.press('Enter')
  await expect(resistance).toHaveValue('4,7k')
  await expect(props.getByRole('alert')).toHaveCount(0)

  await page.keyboard.press('Control+z')
  await expect(resistance).toHaveValue('1k')

  const name = props.getByRole('textbox', { name: 'Nome' })
  await name.fill('Rcarga')
  await name.press('Enter')
  await expect(props.getByTestId('selected-name')).toHaveText('Rcarga')
})

test('ficheiros: guardar o teste 6, Novo, abrir de novo e simular → 21,3 mA', async ({ page }) => {
  // Browser SEM a janela do sistema (como o Firefox/Safari): Guardar descarrega o ficheiro.
  // (Com a janela: ver tests/e2e/guardar.spec.ts.)
  // (A função vem do protótipo de window: tapa-se com undefined em vez de a apagar.)
  await page.addInitScript(
    "for (const n of ['showSaveFilePicker', 'showOpenFilePicker']) " +
      'Object.defineProperty(window, n, { value: undefined, configurable: true })',
  )
  await page.goto('/')
  const scene = page.getByTestId('workspace')
  const props = page.getByRole('complementary', { name: 'Propriedades' })
  await page
    .getByRole('complementary', { name: 'Menu de componentes' })
    .getByRole('button', { name: 'Resistência' })
    .click()
  const resistance = props.getByRole('textbox', { name: 'Resistência', exact: true })
  await resistance.fill('470')
  await resistance.press('Enter')
  await dropAt(page, 'Fonte DC', -160, 0)
  await dropAt(page, 'LED', 160, 0)
  await dropAt(page, 'GND', 0, 120)
  await connect(page, 'V1:+', 'R1:a')
  await connect(page, 'R1:b', 'D1:anodo')
  await connect(page, 'D1:catodo', 'GND1:gnd')
  await connect(page, 'GND1:gnd', 'V1:-')
  await expect(page.getByTestId('unsaved-badge')).toBeVisible() // alterações por guardar

  // Guardar → descarrega circuito.geii.json
  const downloading = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Guardar', exact: true }).click()
  const download = await downloading
  expect(download.suggestedFilename()).toBe('circuito.geii.json')
  const file = await download.path()
  await expect(page.getByTestId('unsaved-badge')).toHaveCount(0)

  // Novo (sem perguntar: está tudo guardado) → zona livre vazia
  await page.getByRole('button', { name: 'Novo' }).click()
  await expect(scene.locator('[data-component-count]')).toHaveAttribute('data-component-count', '0')

  // Abrir o ficheiro guardado → o circuito volta, e o cálculo dá o mesmo
  await page.getByTestId('open-project-input').setInputFiles(file)
  await expect(scene.locator('[data-component-count]')).toHaveAttribute('data-component-count', '4')
  await expect(scene.locator('[data-wire-count]')).toHaveAttribute('data-wire-count', '4')
  await page.getByRole('button', { name: 'Simular' }).click()
  await expect(
    page.getByRole('region', { name: 'Resultados' }).locator('tr[data-component="R1"]'),
  ).toContainText('21,3 mA')
})

test('ficheiros: Novo pergunta se há alterações; ficheiro estragado dá mensagem clara', async ({
  page,
}) => {
  await page.goto('/')
  const scene = page.getByTestId('workspace')
  await page
    .getByRole('complementary', { name: 'Menu de componentes' })
    .getByRole('button', { name: 'Resistência' })
    .click()

  // "Cancelar" na pergunta → nada muda
  page.once('dialog', (dialog) => void dialog.dismiss())
  await page.getByRole('button', { name: 'Novo' }).click()
  await expect(scene.locator('[data-component-count]')).toHaveAttribute('data-component-count', '1')

  // Ficheiro que não é JSON → mensagem, e o circuito atual fica
  await page.getByTestId('open-project-input').setInputFiles({
    name: 'notas.geii.json',
    mimeType: 'application/json',
    buffer: Buffer.from('isto não é um projeto'),
  })
  await expect(page.getByRole('alert')).toContainText(
    'Não foi possível abrir notas.geii.json: não é um ficheiro de projeto',
  )
  await expect(scene.locator('[data-component-count]')).toHaveAttribute('data-component-count', '1')
})

test('etiquetas: o nome de cada componente aparece, em cima do componente certo', async ({
  page,
}) => {
  await page.goto('/')
  const scene = page.getByTestId('workspace')
  await page
    .getByRole('complementary', { name: 'Menu de componentes' })
    .getByRole('button', { name: 'Resistência' })
    .click()
  await dropAt(page, 'Fonte DC', -160, 0)
  await dropAt(page, 'LED', 160, 0)
  await dropAt(page, 'GND', 0, 120)

  for (const name of ['R1', 'V1', 'D1', 'GND1']) {
    await expect(scene.locator(`[data-component-label="${name}"]`)).toBeVisible()
  }
  // Cada nome fica entre os dois terminais do seu componente (na horizontal) e acima deles.
  for (const name of ['R1', 'V1']) {
    const label = await scene.locator(`[data-component-label="${name}"]`).boundingBox()
    const a = await anchor(page, `[data-terminal="${name}:${name === 'R1' ? 'a' : '+'}"]`)
    const b = await anchor(page, `[data-terminal="${name}:${name === 'R1' ? 'b' : '-'}"]`)
    if (!label) throw new Error(`sem etiqueta ${name}`)
    const middle = label.x + label.width / 2
    expect(middle).toBeGreaterThan(Math.min(a.x, b.x))
    expect(middle).toBeLessThan(Math.max(a.x, b.x))
    expect(label.y + label.height / 2).toBeLessThan(a.y)
  }

  // Selecionado → a etiqueta fica azul (data-selected) e as outras não.
  await expect(scene.locator('[data-component-label="GND1"]')).toHaveAttribute(
    'data-selected',
    'true',
  )
  await expect(scene.locator('[data-component-label="R1"]')).toHaveAttribute(
    'data-selected',
    'false',
  )
})

test('cena: depois de Simular o LED acende; com problemas há contorno; mexer apaga tudo', async ({
  page,
}) => {
  //   V1 12 V ── R1 1 kΩ ── D1 ── GND1 : I = (12 − 2) / 1000 = 10 mA < 20 mA → aceso, sem aviso
  await page.goto('/')
  const scene = page.getByTestId('workspace')
  await page
    .getByRole('complementary', { name: 'Menu de componentes' })
    .getByRole('button', { name: 'Resistência' })
    .click()
  await dropAt(page, 'Fonte DC', -160, 0)
  await dropAt(page, 'LED', 160, 0)
  await dropAt(page, 'GND', 0, 120)
  await connect(page, 'V1:+', 'R1:a')
  await connect(page, 'R1:b', 'D1:anodo')
  await connect(page, 'D1:catodo', 'GND1:gnd')

  const led = scene.locator('[data-component-label="D1"]')
  const source = scene.locator('[data-component-label="V1"]')
  await expect(led).toHaveAttribute('data-glow', '0.00') // antes de Simular: apagado

  // Falta o último fio (GND → V1−): V1 tem um terminal solto → aviso (contorno âmbar)
  await page.getByRole('button', { name: 'Simular' }).click()
  await expect(source).toHaveAttribute('data-issue', 'warning')

  await connect(page, 'GND1:gnd', 'V1:-') // mexer no circuito limpa os resultados
  await expect(source).toHaveAttribute('data-issue', 'none')
  await page.getByRole('button', { name: 'Simular' }).click()
  await expect(led).toHaveAttribute('data-glow', '1.00')
  await expect(led).toHaveAttribute('data-issue', 'none')

  await page.getByRole('button', { name: 'Parar' }).click()
  await expect(led).toHaveAttribute('data-glow', '0.00')
})

test('debug: o botão Nós mostra o número do nó de cada terminal (GND = 0)', async ({ page }) => {
  //   V1+ ── R1 ── D1 ── GND1 ── V1− : nós à mão → V1:+ e R1:a = 1; R1:b e D1:anodo = 2;
  //   D1:catodo, GND1 e V1:− = 0 (referência)
  await page.goto('/')
  const scene = page.getByTestId('workspace')
  await page
    .getByRole('complementary', { name: 'Menu de componentes' })
    .getByRole('button', { name: 'Resistência' })
    .click()
  await dropAt(page, 'Fonte DC', -160, 0)
  await dropAt(page, 'LED', 160, 0)
  await dropAt(page, 'GND', 0, 120)
  await connect(page, 'V1:+', 'R1:a')
  await connect(page, 'R1:b', 'D1:anodo')
  await connect(page, 'D1:catodo', 'GND1:gnd')

  const node = (t: string) => scene.locator(`[data-terminal="${t}"]`)
  const button = page.getByRole('button', { name: 'Nós' })
  await expect(button).toHaveAttribute('aria-pressed', 'false')
  await expect(node('V1:+')).not.toHaveAttribute('data-node')

  await button.click()
  await expect(button).toHaveAttribute('aria-pressed', 'true')
  await expect(node('V1:+')).toHaveAttribute('data-node', '1')
  await expect(node('R1:a')).toHaveAttribute('data-node', '1')
  await expect(node('R1:b')).toHaveAttribute('data-node', '2')
  await expect(node('D1:anodo')).toHaveAttribute('data-node', '2')
  await expect(node('D1:catodo')).toHaveAttribute('data-node', '0')
  await expect(node('V1:-')).toHaveAttribute('data-node', '–') // ainda solto
  await expect(node('V1:+')).toHaveText('1') // a etiqueta está visível

  // Ligar o último fio: V1− passa para o nó do GND, sem precisar de Simular
  await connect(page, 'GND1:gnd', 'V1:-')
  await expect(node('V1:-')).toHaveAttribute('data-node', '0')

  await button.click()
  await expect(node('V1:+')).not.toHaveAttribute('data-node')
})

test('a etiqueta (R1) arrasta-se para outro sítio; Ctrl+Z e duplo clique repõem', async ({
  page,
}) => {
  await page.goto('/')
  const scene = page.getByTestId('workspace')
  await page
    .getByRole('complementary', { name: 'Menu de componentes' })
    .getByRole('button', { name: 'Resistência' })
    .click()
  const label = scene.locator('[data-component-label="R1"]')
  const terminal = scene.locator('[data-terminal="R1:a"]')
  const before = await label.boundingBox()
  const pinBefore = await terminal.boundingBox()
  if (!before || !pinBefore) throw new Error('R1 não encontrado')

  // Arrastar a etiqueta 2 quadrados para a direita (pelo rato, como um estudante).
  const x = before.x + before.width / 2
  const y = before.y + before.height / 2
  await page.mouse.move(x, y)
  await page.mouse.down()
  await page.mouse.move(x + sx(40), y, { steps: 5 })
  await page.mouse.move(x + sx(80), y, { steps: 5 })
  await page.mouse.up()

  const after = await label.boundingBox()
  expect((after?.x ?? 0) - before.x).toBeGreaterThan(sx(60))
  // O componente e os terminais não mexeram.
  expect((await terminal.boundingBox())?.x).toBeCloseTo(pinBefore.x, 0)

  // Ctrl+Z: a etiqueta volta ao sítio normal.
  await page.keyboard.press('Control+z')
  await expect.poll(async () => (await label.boundingBox())?.x ?? 0).toBeCloseTo(before.x, 0)

  // Ctrl+Y volta a pô-la ao lado; duplo clique repõe-na.
  await page.keyboard.press('Control+y')
  await expect.poll(async () => (await label.boundingBox())?.x ?? 0).toBeGreaterThan(before.x + 20)
  await label.dblclick()
  await expect.poll(async () => (await label.boundingBox())?.x ?? 0).toBeCloseTo(before.x, 0)
})

test('propriedades em 3 secções; potência da resistência numa lista e aviso de sobreaquecimento', async ({
  page,
}) => {
  //   V1 (12 V) ── R1 (1 kΩ) ── GND :  P(R1) = 12² / 1000 = 144 mW
  //   1/4 W (250 mW) aguenta ; 1/8 W (125 mW) não → aquece demais ; 1/2 W volta a aguentar.
  await page.goto('/')
  const props = page.getByRole('complementary', { name: 'Propriedades' })
  await page
    .getByRole('complementary', { name: 'Menu de componentes' })
    .getByRole('button', { name: 'Resistência' })
    .click()
  for (const section of ['Identificação', 'Parâmetros elétricos', 'Parâmetros complementares']) {
    await expect(props.getByRole('region', { name: section })).toBeVisible()
  }
  await expect(props.getByTestId('selected-type')).toHaveText('Resistência')
  const rated = props.getByRole('combobox', { name: 'Potência nominal' })
  await expect(rated.locator('option')).toHaveText(['1/8 W', '1/4 W', '1/2 W', '1 W', '2 W'])
  await expect(rated).toHaveValue('0.25')

  await dropAt(page, 'Fonte DC', -160, 0)
  await dropAt(page, 'GND', 0, 120)
  await connect(page, 'V1:+', 'R1:a')
  await connect(page, 'R1:b', 'GND1:gnd')
  await connect(page, 'GND1:gnd', 'V1:-')
  await page.getByRole('button', { name: 'Simular' }).click()

  // Selecionar R1 (clique no meio, entre os dois terminais).
  const a = await anchor(page, '[data-terminal="R1:a"]')
  const b = await anchor(page, '[data-terminal="R1:b"]')
  await page.mouse.click((a.x + b.x) / 2, (a.y + b.y) / 2)
  await expect(props.getByTestId('selected-name')).toHaveText('R1')
  const power = props.getByTestId('resistor-power')
  await expect(power).toHaveAttribute('data-overheat', 'false')
  await expect(power).toContainText('144 mW')

  await rated.selectOption('0.125')
  await expect(power).toHaveAttribute('data-overheat', 'true')
  await expect(page.getByRole('region', { name: 'Resultados' })).toContainText('aquecia demais')

  await rated.selectOption('0.5')
  await expect(power).toHaveAttribute('data-overheat', 'false')
})
