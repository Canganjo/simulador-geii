import { expect, test, type Page } from '@playwright/test'

/**
 * Guardar / Guardar como… com a janela do sistema (Chrome, Edge) — issue #55.
 *
 * Um teste automático não consegue clicar na janela verdadeira do Windows, por isso ela é
 * substituída por uma "falsa" que regista o nome sugerido e o que foi gravado no ficheiro.
 */

test.setTimeout(90_000)

interface FakeDisk {
  /** Nomes sugeridos de cada vez que a janela "Guardar como" abriu. */
  saveDialogs: string[]
  /** Cada gravação: { file, text }. */
  writes: { file: string; text: string }[]
}

/**
 * Instala as janelas falsas (código que corre no browser, por isso vai como texto).
 * window.__answer = nome escolhido pelo "utilizador", ou 'cancel' para carregar em Cancelar.
 * window.__openText = conteúdo do ficheiro que a janela "Abrir" devolve.
 */
const FAKE_PICKERS = `
  const disk = { saveDialogs: [], writes: [] }
  window.__disk = disk
  window.__answer = 'divisor 12V.geii.json'
  window.__openText = ''
  const handle = (name) => ({
    name,
    createWritable: async () => {
      let text = ''
      return {
        write: async (data) => { text += data },
        close: async () => { disk.writes.push({ file: name, text }) },
      }
    },
    getFile: async () => new File([String(window.__openText)], name, { type: 'application/json' }),
  })
  window.showSaveFilePicker = async (options) => {
    disk.saveDialogs.push(options.suggestedName)
    if (window.__answer === 'cancel') throw new DOMException('cancelado', 'AbortError')
    return handle(String(window.__answer))
  }
  window.showOpenFilePicker = async () => [handle('aberto.geii.json')]
`

const fakePickers = (page: Page) => page.addInitScript(FAKE_PICKERS)

const disk = (page: Page) => page.evaluate('window.__disk') as Promise<FakeDisk>
const button = (page: Page, name: string) => page.getByRole('button', { name, exact: true })
const addResistor = (page: Page) =>
  page
    .getByRole('complementary', { name: 'Menu de componentes' })
    .getByRole('button', { name: 'Resistência' })
    .click()

test('1.º Guardar pergunta onde; os seguintes gravam no mesmo ficheiro sem perguntar', async ({
  page,
}) => {
  await fakePickers(page)
  await page.goto('/')
  await addResistor(page)
  await expect(page.getByTestId('unsaved-badge')).toBeVisible()
  // Projeto novo: ainda sem ficheiro (a barra diz), e a dica do Guardar explica que vai perguntar.
  await expect(page.getByTestId('current-file')).toHaveText('Ainda não guardado')
  await expect(button(page, 'Guardar')).toHaveAttribute('title', /pergunta onde guardar/)

  // 1.º Guardar → abre a janela (nome sugerido: circuito.geii.json) e grava lá.
  await button(page, 'Guardar').click()
  await expect.poll(async () => (await disk(page)).writes.length).toBe(1)
  let d = await disk(page)
  expect(d.saveDialogs).toEqual(['circuito.geii.json'])
  expect(d.writes[0]?.file).toBe('divisor 12V.geii.json')
  // O projeto passa a chamar-se como o ficheiro escolhido.
  expect(JSON.parse(d.writes[0]?.text ?? '{}')).toMatchObject({ name: 'divisor 12V' })
  await expect(page.getByTestId('unsaved-badge')).toHaveCount(0)
  // A barra mostra o ficheiro onde o Guardar passa a gravar, e um aviso confirma.
  await expect(page.getByTestId('current-file')).toHaveText('divisor 12V.geii.json')
  await expect(page.getByTestId('save-notice')).toHaveText('Guardado como divisor 12V.geii.json')
  await expect(button(page, 'Guardar')).toHaveAttribute('title', /por cima de divisor 12V/)

  // Mais uma alteração + Ctrl+S → grava no MESMO ficheiro, sem abrir a janela.
  await addResistor(page)
  await page.keyboard.press('Control+s')
  await expect.poll(async () => (await disk(page)).writes.length).toBe(2)
  d = await disk(page)
  expect(d.saveDialogs).toHaveLength(1)
  expect(d.writes[1]?.file).toBe('divisor 12V.geii.json')
  expect(JSON.parse(d.writes[1]?.text ?? '{}').components).toHaveLength(2)
  await expect(page.getByTestId('save-notice')).toHaveText('Guardado em divisor 12V.geii.json')

  // Guardar como… → pergunta outra vez (sugere o nome atual) e grava no ficheiro novo.
  await page.evaluate("window.__answer = 'copia.geii.json'")
  await button(page, 'Guardar como…').click()
  await expect.poll(async () => (await disk(page)).writes.length).toBe(3)
  d = await disk(page)
  expect(d.saveDialogs).toEqual(['circuito.geii.json', 'divisor-12v.geii.json'])
  expect(d.writes[2]?.file).toBe('copia.geii.json')
  // Daqui para a frente o Guardar grava na cópia.
  await expect(page.getByTestId('current-file')).toHaveText('copia.geii.json')
})

test('Cancelar na janela não grava nada e as alterações continuam por guardar', async ({
  page,
}) => {
  await fakePickers(page)
  await page.goto('/')
  await addResistor(page)
  await page.evaluate("window.__answer = 'cancel'")
  await page.keyboard.press('Control+Shift+s')
  await expect.poll(async () => (await disk(page)).saveDialogs.length).toBe(1)
  expect((await disk(page)).writes).toEqual([])
  await expect(page.getByTestId('unsaved-badge')).toBeVisible()
})

test('Abrir com a janela: depois, Guardar grava no ficheiro aberto', async ({ page }) => {
  await fakePickers(page)
  await page.goto('/')
  // Um projeto guardado antes (só com R1), para a janela "Abrir" devolver.
  await addResistor(page)
  await button(page, 'Guardar').click()
  await expect.poll(async () => (await disk(page)).writes.length).toBe(1)
  const saved = (await disk(page)).writes[0]?.text ?? ''
  await page.evaluate(`window.__openText = ${JSON.stringify(saved)}`)

  await button(page, 'Novo').click()
  await expect(page.getByTestId('workspace').locator('[data-component-count]')).toHaveAttribute(
    'data-component-count',
    '0',
  )
  await expect(page.getByTestId('current-file')).toHaveText('Ainda não guardado')
  await button(page, 'Abrir').click()
  await expect(page.getByTestId('workspace').locator('[data-component-count]')).toHaveAttribute(
    'data-component-count',
    '1',
  )
  await expect(page.getByTestId('current-file')).toHaveText('aberto.geii.json')

  await addResistor(page)
  await page.keyboard.press('Control+s')
  await expect.poll(async () => (await disk(page)).writes.length).toBe(2)
  const d = await disk(page)
  expect(d.saveDialogs).toHaveLength(1) // só a do primeiro Guardar
  expect(d.writes[1]?.file).toBe('aberto.geii.json')
})
