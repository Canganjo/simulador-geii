/**
 * Correntes "ao vivo" nos fios, partilhadas entre os objetos da cena SEM passar pelo React.
 *
 * O ChargeFlow escreve aqui a corrente de cada fio a cada imagem (no transitório ela muda com
 * o tempo); cada WireView lê o seu valor para a cor e para piscar. Se isto fosse estado React,
 * a cena inteira voltava a desenhar-se 60 vezes por segundo.
 */
export class LiveCurrents {
  /** Corrente de cada fio, em A (positivo = do `from` para o `to` do fio). */
  readonly values = new Map<string, number>()
  /** Instante simulado que se está a mostrar (transitório), em s; null em DC. */
  time: number | null = null

  clear(): void {
    this.values.clear()
    this.time = null
  }
}
