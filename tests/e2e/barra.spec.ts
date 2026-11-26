import { expect, test, type Page } from '@playwright/test'

/**
 * Barra de cima (issue #104): em computador, a barra de ações cabe sem deslizar.
 *
 * Ela pode deslizar para o lado, mas a barra de deslocamento está escondida. Se não couber, um
 * botão fica fora de vista sem sinal nenhum (com o "Mostrar corrente", o Novo e o Abrir saíam
 * pela esquerda a 1440 px). Testa-se nas três línguas, porque os nomes em francês são os mais
 * compridos, e nas larguras onde os nomes aparecem ou desaparecem (1024, 1280, 1440, 1860 px).
 */

const LARGURAS = [1024, 1279, 1280, 1366, 1439, 1440, 1536, 1859, 1860, 1920]
const LINGUAS = ['pt', 'fr', 'en'] as const

async function abrirEm(page: Page, lingua: (typeof LINGUAS)[number], largura: number) {
  await page.addInitScript((language) => {
    localStorage.setItem(
      'simulador-geii:idioma',
      JSON.stringify({ state: { language }, version: 0 }),
    )
  }, lingua)
  await page.setViewportSize({ width: largura, height: 800 })
  await page.goto('/')
}

for (const lingua of LINGUAS) {
  test(`barra de cima cabe sem deslizar (${lingua}, ${LARGURAS.join(' / ')} px)`, async ({
    page,
  }) => {
    for (const largura of LARGURAS) {
      await abrirEm(page, lingua, largura)
      const nav = page.locator('header nav')
      await expect(nav).toBeVisible()
      const { scroll, client } = await nav.evaluate((el) => ({
        scroll: el.scrollWidth,
        client: el.clientWidth,
      }))
      expect(
        scroll,
        `${lingua} a ${largura} px: a barra precisa de ${scroll} px e tem ${client}`,
      ).toBeLessThanOrEqual(client)
    }
  })
}

test('a 1440 px, depois de ligar "Mostrar corrente", o Novo e o Abrir continuam à vista', async ({
  page,
}) => {
  await abrirEm(page, 'pt', 1440)
  const nav = page.locator('header nav')
  await nav.getByRole('button', { name: 'Mostrar corrente' }).click()
  const caixa = await nav.boundingBox()
  if (!caixa) throw new Error('barra de ações não encontrada')
  for (const nome of ['Novo', 'Abrir', 'Simular', 'Mostrar corrente']) {
    const b = await nav.getByRole('button', { name: nome, exact: true }).boundingBox()
    if (!b) throw new Error(`botão ${nome} não encontrado`)
    // O botão inteiro está dentro da parte visível da barra.
    expect(b.x, nome).toBeGreaterThanOrEqual(caixa.x - 0.5)
    expect(b.x + b.width, nome).toBeLessThanOrEqual(caixa.x + caixa.width + 0.5)
  }
})
