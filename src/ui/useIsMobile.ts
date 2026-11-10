import { useSyncExternalStore } from 'react'

/**
 * Largura a partir da qual o ecrã é "grande" (tablet/computador). Igual ao `md` do Tailwind.
 * Abaixo disto (telemóvel), o menu e as propriedades passam a ser gavetas por cima da cena.
 */
export const MOBILE_QUERY = '(max-width: 767px)'

function subscribe(onChange: () => void): () => void {
  const media = window.matchMedia(MOBILE_QUERY)
  media.addEventListener('change', onChange)
  return () => media.removeEventListener('change', onChange)
}

/** Verdadeiro num ecrã estreito (telemóvel). Atualiza-se ao rodar o telemóvel. */
export function useIsMobile(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(MOBILE_QUERY).matches,
    () => false,
  )
}
