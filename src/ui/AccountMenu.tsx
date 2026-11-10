import {
  ChevronDown,
  Globe,
  Info,
  LockKeyhole,
  Palette,
  Pencil,
  Power,
  type LucideIcon,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { LANGUAGES, useLanguageStore } from '../store/languageStore'
import { useProfileStore } from '../store/profileStore'
import { LANGUAGE_NAMES, useT } from './i18n'
import { initials, username } from './initials'

const REPO_URL = 'https://github.com/Canganjo/simulador-geii'

/**
 * Botão de conta no canto superior direito (como no Gmail), segundo o modelo do ElectroC
 * (AccountButton.cs + BuildAccountMenu): círculo verde com as iniciais e contorno amarelo,
 * nome, seta; o menu mostra o nome, o @utilizador e as ações da conta.
 *
 * Ainda não há contas nem login: o nome vem de um perfil local (clicar no nome, dentro do menu,
 * para o mudar). As ações sem efeito ainda (password, idioma, aparência, terminar sessão)
 * ficam ligadas quando essas funcionalidades existirem.
 */
export function AccountMenu() {
  const t = useT()
  const name = useProfileStore((s) => s.name)
  const setName = useProfileStore((s) => s.setName)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(name)
  const rootRef = useRef<HTMLDivElement>(null)

  // Fechar ao clicar fora do menu ou ao carregar em Escape.
  useEffect(() => {
    if (!open) return
    const hide = () => {
      setOpen(false)
      setEditing(false)
    }
    const onPointer = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) hide()
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') hide()
    }
    document.addEventListener('pointerdown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  function close() {
    setOpen(false)
    setEditing(false)
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => (open ? close() : setOpen(true))}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t('account.label', { name })}
        className="flex h-11 max-w-72 items-center gap-2.5 rounded-full py-1 pr-2 pl-1 text-sm font-semibold text-slate-100 hover:bg-slate-700"
      >
        <span
          aria-hidden
          className="flex size-9 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-sm font-semibold text-white ring-2 ring-amber-400"
        >
          {initials(name)}
        </span>
        <span className="hidden truncate md:inline">{name}</span>
        <ChevronDown
          className={`hidden size-4 shrink-0 text-slate-400 transition-transform md:block ${open ? 'rotate-180' : ''}`}
          aria-hidden
        />
      </button>

      {open && (
        <div
          role="menu"
          aria-label={t('account.menu')}
          className="absolute top-full right-0 z-20 mt-1 w-64 border border-slate-600 bg-slate-800 py-1.5 shadow-xl shadow-black/40"
        >
          {/* Cabeçalho: nome + @utilizador */}
          {editing ? (
            <form
              className="flex gap-2 px-3 py-1.5"
              onSubmit={(e) => {
                e.preventDefault()
                setName(draft)
                setEditing(false)
              }}
            >
              <input
                autoFocus
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                aria-label={t('account.name')}
                maxLength={60}
                className="min-w-0 flex-1 rounded bg-slate-900 px-2 py-1 text-sm text-slate-100 outline-none focus:ring-2 focus:ring-amber-400"
              />
              <button
                type="submit"
                className="rounded bg-emerald-600 px-2.5 py-1 text-sm font-medium text-white hover:bg-emerald-500"
              >
                {t('account.save')}
              </button>
            </form>
          ) : (
            <button
              type="button"
              onClick={() => {
                setDraft(name)
                setEditing(true)
              }}
              aria-label={t('account.rename')}
              title={t('account.renameHint')}
              className="group flex w-full items-start justify-between px-3 py-1 text-left hover:bg-slate-700/60"
            >
              <span className="min-w-0">
                <span className="block truncate font-semibold text-slate-100">{name}</span>
                <span className="block truncate text-sm text-slate-400">@{username(name)}</span>
              </span>
              <Pencil
                className="mt-1 size-3.5 shrink-0 text-slate-500 opacity-0 group-hover:opacity-100"
                aria-hidden
              />
            </button>
          )}

          <Separator />
          <MenuItem icon={LockKeyhole} label={t('account.password')} onClick={close} />
          <LanguageSwitch />
          <MenuItem icon={Palette} label={t('account.appearance')} onClick={close} />
          <MenuItem
            icon={Info}
            label={t('account.about')}
            onClick={() => {
              window.open(REPO_URL, '_blank', 'noopener')
              close()
            }}
          />
          <Separator />
          <MenuItem icon={Power} label={t('account.logout')} danger onClick={close} />
        </div>
      )}
    </div>
  )
}

/**
 * Linha "Idioma" com um interruptor de 3 posições: PT · FR · EN.
 * Um toque muda a língua da app toda na hora (e fica guardada). O menu continua aberto,
 * para se ver logo o resultado.
 */
function LanguageSwitch() {
  const t = useT()
  const language = useLanguageStore((s) => s.language)
  const setLanguage = useLanguageStore((s) => s.setLanguage)

  return (
    <div className="flex items-center gap-3 px-3 py-1.5 text-sm text-slate-200">
      <Globe className="size-4 shrink-0" aria-hidden />
      <span id="account-language">{t('account.language')}</span>
      <div
        role="radiogroup"
        aria-labelledby="account-language"
        className="ml-auto flex rounded-md border border-slate-600 p-0.5"
      >
        {LANGUAGES.map((code) => (
          <button
            key={code}
            type="button"
            role="radio"
            aria-checked={language === code}
            aria-label={LANGUAGE_NAMES[code]}
            title={LANGUAGE_NAMES[code]}
            lang={code}
            onClick={() => setLanguage(code)}
            className={`rounded px-2 py-0.5 text-xs font-semibold uppercase ${
              language === code ? 'bg-sky-600 text-white' : 'text-slate-300 hover:bg-slate-700'
            }`}
          >
            {code}
          </button>
        ))}
      </div>
    </div>
  )
}

function Separator() {
  return <div role="separator" className="my-1 border-t border-slate-600" />
}

interface MenuItemProps {
  icon: LucideIcon
  label: string
  onClick: () => void
  danger?: boolean
}

function MenuItem({ icon: Icon, label, onClick, danger }: MenuItemProps) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className={`flex w-full items-center gap-3 px-3 py-2 text-left text-sm hover:bg-sky-900/60 focus-visible:bg-sky-900/60 focus-visible:outline-none ${
        danger ? 'text-red-400' : 'text-slate-200'
      }`}
    >
      <Icon className="size-4 shrink-0" aria-hidden />
      {label}
    </button>
  )
}
