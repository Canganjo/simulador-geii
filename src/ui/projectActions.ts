import { PROJECT_FORMAT_VERSION, type Project } from '../core/model'
import {
  parseProjectFile,
  projectFileName,
  toProjectFile,
  type ProjectFileError,
} from '../persistence/projectFile'
import { hasUnsavedChanges, useCircuitStore } from '../store/circuitStore'

/**
 * Ações dos botões Novo / Abrir / Guardar (e Ctrl+S / Ctrl+O).
 * O formato do ficheiro está em src/persistence; aqui só se liga ao browser e à store.
 */

/** O projeto atual, pronto a guardar. */
export function currentProject(): Project {
  const { projectName, createdAt, components, wires } = useCircuitStore.getState()
  return {
    version: PROJECT_FORMAT_VERSION,
    name: projectName,
    components,
    wires,
    createdAt,
    updatedAt: new Date().toISOString(),
  }
}

/** Guardar: descarrega `<nome>.geii.json` (vai para a pasta de Transferências do browser). */
export function saveProject(): void {
  const project = currentProject()
  const blob = new Blob([toProjectFile(project)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = projectFileName(project.name)
  link.click()
  // Dá tempo ao browser para começar o download antes de libertar o endereço.
  setTimeout(() => URL.revokeObjectURL(url), 1000)
  useCircuitStore.getState().markSaved()
}

/** Abrir: lê o ficheiro escolhido. Devolve null se abriu, ou o motivo da recusa. */
export async function openProjectFile(file: File): Promise<ProjectFileError | null> {
  const result = parseProjectFile(await file.text())
  if (!result.ok) return result.error
  useCircuitStore.getState().loadProject(result.project)
  return null
}

/** Pede confirmação antes de deitar fora alterações por guardar (Novo, Abrir). */
export function confirmDiscard(question: string): boolean {
  return !hasUnsavedChanges(useCircuitStore.getState()) || window.confirm(question)
}
