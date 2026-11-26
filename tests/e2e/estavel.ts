import { expect, type Locator } from '@playwright/test'

type Box = NonNullable<Awaited<ReturnType<Locator['boundingBox']>>>

/**
 * Caixa de um elemento depois de ele parar de mexer.
 *
 * Logo a seguir a criar um componente, ele (e a etiqueta) ainda pode estar a ir para o lugar
 * final. Medir nesse momento dava diferenças de centenas de píxeis sem ninguém ter tocado em
 * nada, sobretudo num computador mais lento ou com vários testes ao mesmo tempo.
 */
export async function settledBox(locator: Locator): Promise<Box> {
  // A 1.ª leitura do poll é imediata: só se compara a partir da 2.ª (≥ 100 ms depois).
  let last: Box | null = null
  await expect
    .poll(async () => {
      const now = await locator.boundingBox()
      const still =
        now !== null &&
        last !== null &&
        Math.abs(now.x - last.x) < 0.5 &&
        Math.abs(now.y - last.y) < 0.5
      last = now
      return still
    })
    .toBe(true)
  const box = await locator.boundingBox()
  if (!box) throw new Error('elemento desapareceu depois de parar')
  return box
}
