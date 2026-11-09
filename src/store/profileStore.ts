import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/**
 * Perfil local do utilizador (ainda não há contas nem login).
 * Fica guardado no browser (localStorage), por isso o nome mantém-se ao recarregar a página.
 */
interface ProfileState {
  name: string
  setName: (name: string) => void
}

export const DEFAULT_PROFILE_NAME = 'Convidado'

export const useProfileStore = create<ProfileState>()(
  persist(
    (set) => ({
      name: DEFAULT_PROFILE_NAME,
      setName: (name) => set({ name: name.trim() || DEFAULT_PROFILE_NAME }),
    }),
    { name: 'simulador-geii:perfil' },
  ),
)
