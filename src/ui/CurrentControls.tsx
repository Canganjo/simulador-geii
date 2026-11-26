import { Zap } from 'lucide-react'
import type { FlowDirection } from '../core/wires'
import { useLanguageStore } from '../store/languageStore'
import { ANIMATION_SPEED_LIMITS, useUiStore } from '../store/uiStore'
import { decimalSeparator, useT } from './i18n'

/**
 * Painel pequeno (canto inferior esquerdo da zona livre) quando "Mostrar corrente" está ligado:
 * sentido das cargas (convencional ou eletrões) e velocidade da animação.
 * Sem simulação feita, lembra que é preciso Simular primeiro.
 */
export function CurrentControls({ hasResult }: { hasResult: boolean }) {
  const t = useT()
  const direction = useUiStore((s) => s.flowDirection)
  const setDirection = useUiStore((s) => s.setFlowDirection)
  const speed = useUiStore((s) => s.animationSpeed)
  const setSpeed = useUiStore((s) => s.setAnimationSpeed)
  const decimal = decimalSeparator(useLanguageStore((s) => s.language))
  const options: { value: FlowDirection; label: string; dot: string }[] = [
    { value: 'conventional', label: t('current.conventional'), dot: 'bg-yellow-300' },
    { value: 'electron', label: t('current.electron'), dot: 'bg-cyan-300' },
  ]

  return (
    <section
      aria-label={t('current.controls')}
      className="absolute bottom-6 left-2 z-10 w-56 rounded-md border border-slate-700 bg-slate-900/90 p-2 text-xs text-slate-200 shadow-lg"
    >
      <h2 className="mb-1.5 flex items-center gap-1 font-semibold text-amber-300">
        <Zap className="size-3.5" aria-hidden />
        {t('current.controls')}
      </h2>
      {!hasResult && <p className="mb-1.5 text-slate-400">{t('current.needsRun')}</p>}

      <div role="radiogroup" className="mb-2 flex flex-col gap-0.5">
        {options.map((o) => (
          <label key={o.value} className="flex cursor-pointer items-center gap-1.5">
            <input
              type="radio"
              name="flow-direction"
              value={o.value}
              checked={direction === o.value}
              onChange={() => setDirection(o.value)}
              className="accent-amber-400"
            />
            <span className={`inline-block size-2 rounded-full ${o.dot}`} aria-hidden />
            {o.label}
          </label>
        ))}
      </div>

      <label className="flex flex-col gap-0.5">
        <span className="flex justify-between">
          {t('current.speed')}
          <span className="font-mono text-slate-400">
            ×{speed.toFixed(2).replace('.', decimal)}
          </span>
        </span>
        <input
          type="range"
          min={ANIMATION_SPEED_LIMITS.min}
          max={ANIMATION_SPEED_LIMITS.max}
          step={0.25}
          value={speed}
          onChange={(e) => setSpeed(Number(e.target.value))}
          className="accent-amber-400"
        />
      </label>
    </section>
  )
}
