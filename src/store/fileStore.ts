import { create } from 'zustand'

/**
 * Que ficheiro do disco está aberto, e o que fez o último Guardar — para a interface MOSTRAR
 * a diferença entre "Guardar" (grava no ficheiro atual, sem perguntar) e "Guardar como…"
 * (pergunta sempre a pasta e o nome).
 *
 * O "handle" do ficheiro (a referência para voltar a gravar) fica em ui/projectActions.ts;
 * aqui só fica o nome, que é o que a interface precisa de desenhar.
 */

/** Como acabou o último Guardar ('write-failed': não gravou no ficheiro escolhido, descarregou uma cópia). */
export type SaveNoticeKind = 'saved' | 'saved-as' | 'downloaded' | 'write-failed'

export interface SaveNotice {
  kind: SaveNoticeKind
  /** Nome do ficheiro gravado ou descarregado. */
  file: string
  /** Muda a cada aviso (para a interface saber que é um aviso novo, mesmo igual ao anterior). */
  id: number
}

interface FileState {
  /** Nome do ficheiro atual no disco (ex.: "divisor.geii.json"), ou null se ainda não tem. */
  fileName: string | null
  /** Último aviso de gravação (some sozinho na interface). */
  notice: SaveNotice | null
  setFileName: (fileName: string | null) => void
  notify: (kind: SaveNoticeKind, file: string) => void
  clearNotice: () => void
}

export const useFileStore = create<FileState>()((set) => ({
  fileName: null,
  notice: null,
  setFileName: (fileName) => set({ fileName }),
  notify: (kind, file) => set((s) => ({ notice: { kind, file, id: (s.notice?.id ?? 0) + 1 } })),
  clearNotice: () => set({ notice: null }),
}))
