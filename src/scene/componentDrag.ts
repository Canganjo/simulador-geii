/**
 * Ligação entre o menu (src/ui) e a zona livre (src/scene) para criar componentes.
 *
 * - Arrastar: o item do menu põe o tipo do componente no `dataTransfer` com este formato;
 *   a zona livre lê-o ao largar.
 * - Clicar: o menu envia um evento `geii:place-component`; a zona livre coloca o componente
 *   no centro da vista (numa célula livre).
 */

import { CATALOG } from '../core/library'
import type { ComponentKind } from '../core/model'

export const COMPONENT_DRAG_TYPE = 'application/x-geii-component'
export const PLACE_COMPONENT_EVENT = 'geii:place-component'

export function isComponentKind(value: string): value is ComponentKind {
  return Object.hasOwn(CATALOG, value)
}

/** Pede à zona livre para colocar um componente no centro da vista. */
export function requestPlaceComponent(kind: ComponentKind): void {
  window.dispatchEvent(new CustomEvent<ComponentKind>(PLACE_COMPONENT_EVENT, { detail: kind }))
}
