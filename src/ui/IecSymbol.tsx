import type { ReactNode } from 'react'
import type { ComponentKind } from '../core/model'

/**
 * Símbolos IEC (norma europeia, IEC 60617) desenhados em SVG, 40 × 24.
 * Usam `currentColor`, por isso seguem a cor do texto à volta.
 */
const PATHS: Record<ComponentKind, ReactNode> = {
  // Resistência IEC: retângulo (não o zigue-zague americano)
  resistor: (
    <>
      <path d="M2 12h9M29 12h9" />
      <rect x="11" y="7" width="18" height="10" />
    </>
  ),
  // Fonte de tensão DC: traço longo (+) e traço curto (−)
  'dc-source': (
    <>
      <path d="M2 12h15M23 12h15" />
      <path d="M17 4v16" />
      <path d="M23 8v8" strokeWidth={3} />
    </>
  ),
  // Massa / GND: três traços cada vez mais curtos
  ground: (
    <>
      <path d="M20 2v10" />
      <path d="M10 12h20M14 16h12M18 20h4" />
    </>
  ),
  // Interruptor (aberto)
  switch: (
    <>
      <path d="M2 14h10M28 14h10" />
      <path d="M12 14l15-8" />
      <circle cx="12" cy="14" r="1.2" />
    </>
  ),
  // LED: díodo (triângulo + barra) com duas setas para fora
  led: (
    <>
      <path d="M2 14h12M26 14h12" />
      <path d="M14 8v12l12-6z" />
      <path d="M26 8v12" />
      <path d="M22 6l4-4M26 6l4-4" />
      <path d="M24 2h2v2M28 2h2v2" />
    </>
  ),
  // Lâmpada: círculo com uma cruz
  lamp: (
    <>
      <path d="M2 12h10M28 12h10" />
      <circle cx="20" cy="12" r="8" />
      <path d="M14.3 6.3l11.4 11.4M25.7 6.3L14.3 17.7" />
    </>
  ),
}

export function IecSymbol({ kind, className }: { kind: ComponentKind; className?: string }) {
  return (
    <svg
      viewBox="0 0 40 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      {PATHS[kind]}
    </svg>
  )
}
