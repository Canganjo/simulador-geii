import { useState, type FormEvent } from 'react'
import { X } from 'lucide-react'
import { MAX_TRANSIENT_STEPS } from '../core/solver'
import { useLanguageStore } from '../store/languageStore'
import { useSimulationStore } from '../store/simulationStore'
import { decimalSeparator, useT } from './i18n'
import { parseSi } from './parseSi'

/**
 * Janela do botão "Transitório" (E10): duração e passo da simulação no tempo.
 * Aceita prefixos, como os outros campos: "0,5 s", "500m", "1 ms", "10 µs".
 *
 * Valores por defeito: 0,5 s com passo de 1 ms = 500 passos (chega para ver a carga de um
 * condensador de 100 µF com 1 kΩ: τ = 0,1 s, ao fim de 5τ está a 99,3 %).
 */

interface Props {
  onClose: () => void
}

/** Últimos valores usados (ficam enquanto a página estiver aberta). */
let lastDuration: string | null = null
let lastStep: string | null = null

export function TransientDialog({ onClose }: Props) {
  const t = useT()
  const decimal = decimalSeparator(useLanguageStore((s) => s.language))
  const [duration, setDuration] = useState(lastDuration ?? `0${decimal}5 s`)
  const [step, setStep] = useState(lastStep ?? '1 ms')
  const [error, setError] = useState<string | null>(null)

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    const d = parseSi(duration, 's')
    const h = parseSi(step, 's')
    if (d === null || h === null || !(d > 0) || !(h > 0)) {
      setError(t('transient.invalid'))
      return
    }
    const steps = Math.round(d / h)
    if (steps < 1 || steps > MAX_TRANSIENT_STEPS) {
      setError(t('transient.tooMany', { steps, max: MAX_TRANSIENT_STEPS }))
      return
    }
    lastDuration = duration
    lastStep = step
    useSimulationStore.getState().runTransient({ duration: d, step: h })
    onClose()
  }

  const field =
    'w-28 rounded border border-slate-600 bg-slate-900 px-2 py-1 text-slate-100 focus:border-sky-400 focus:outline-none'

  return (
    <form
      role="dialog"
      aria-label={t('transient.title')}
      onSubmit={onSubmit}
      onKeyDown={(e) => {
        if (e.key === 'Escape') onClose()
      }}
      className="absolute top-full left-1/2 z-40 mt-2 flex w-[min(24rem,calc(100vw-2rem))] -translate-x-1/2 flex-col gap-3 rounded border border-slate-600 bg-slate-800 p-3 text-sm text-slate-200 shadow-xl shadow-black/40"
    >
      <div className="flex items-start justify-between gap-2">
        <h2 className="font-semibold text-slate-100">{t('transient.title')}</h2>
        <button
          type="button"
          onClick={onClose}
          aria-label={t('transient.cancel')}
          className="rounded p-0.5 text-slate-300 hover:bg-slate-700"
        >
          <X className="size-4" aria-hidden />
        </button>
      </div>
      <p className="text-slate-400">{t('transient.hint')}</p>
      <div className="flex flex-wrap gap-4">
        <label className="flex flex-col gap-1">
          {t('transient.duration')}
          <input
            autoFocus
            className={field}
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1">
          {t('transient.step')}
          <input className={field} value={step} onChange={(e) => setStep(e.target.value)} />
        </label>
      </div>
      {error && (
        <p role="alert" className="text-red-300">
          {error}
        </p>
      )}
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          className="rounded px-2 py-1 text-slate-300 hover:bg-slate-700"
        >
          {t('transient.cancel')}
        </button>
        <button
          type="submit"
          className="rounded bg-sky-600 px-3 py-1 font-medium text-white hover:bg-sky-500"
        >
          {t('transient.run')}
        </button>
      </div>
    </form>
  )
}
