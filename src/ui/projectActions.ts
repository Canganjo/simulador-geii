import { PROJECT_FORMAT_VERSION, type Project } from '../core/model'
import {
  parseProjectFile,
  projectFileName,
  projectNameFromFile,
  toProjectFile,
  type ProjectFileError,
} from '../persistence/projectFile'
import { hasUnsavedChanges, useCircuitStore } from '../store/circuitStore'
import { useFileStore } from '../store/fileStore'
import { isCancel, openPicker, savePicker, writeText, type FileHandle } from './fileSystem'

/**
 * Ações dos botões Novo / Abrir / Guardar / Guardar como (e Ctrl+S / Ctrl+Shift+S / Ctrl+O).
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

/**
 * O ficheiro do disco onde o projeto está guardado (depois de "Guardar como" ou de "Abrir" com a
 * janela do sistema). Com ele, "Guardar" volta a gravar no mesmo sítio sem perguntar.
 * null = projeto novo, ou browser sem a janela do sistema.
 */
let currentFile: FileHandle | null = null

/** Muda o ficheiro atual e avisa a interface (que mostra o nome na barra de cima). */
function setCurrentFile(handle: FileHandle | null): void {
  currentFile = handle
  useFileStore.getState().setFileName(handle?.name ?? null)
}

/** Nome do ficheiro atual no disco (ex.: "divisor.geii.json"), ou null. */
export function currentFileName(): string | null {
  return currentFile?.name ?? null
}

/** Esquece o ficheiro atual (Novo, ou um projeto aberto sem a janela do sistema). */
export function forgetCurrentFile(): void {
  setCurrentFile(null)
}

/** Como acabou um Guardar: gravado no disco, descarregado, ou cancelado pelo utilizador. */
export type SaveOutcome = 'saved' | 'downloaded' | 'cancelled'

/**
 * Guardar (Ctrl+S): se o projeto já tem um ficheiro no disco, grava lá sem perguntar;
 * senão faz "Guardar como".
 */
export async function saveProject(): Promise<SaveOutcome> {
  if (currentFile) {
    try {
      await writeText(currentFile, toProjectFile(currentProject()))
      useCircuitStore.getState().markSaved()
      useFileStore.getState().notify('saved', currentFile.name)
      return 'saved'
    } catch {
      // Sem permissão ou ficheiro apagado entretanto: pergunta outra vez onde guardar.
      setCurrentFile(null)
    }
  }
  return saveProjectAs()
}

/**
 * Guardar como (Ctrl+Shift+S): abre a janela do sistema para escolher a PASTA e o NOME.
 * O nome do projeto passa a ser o do ficheiro. Sem essa janela (Firefox, Safari), descarrega.
 */
export async function saveProjectAs(): Promise<SaveOutcome> {
  const picker = savePicker()
  if (!picker) {
    download()
    return 'downloaded'
  }
  let handle: FileHandle
  try {
    handle = await picker({
      suggestedName: projectFileName(useCircuitStore.getState().projectName),
    })
  } catch (error) {
    if (isCancel(error)) return 'cancelled'
    download() // a janela falhou por outro motivo: pelo menos o ficheiro não se perde
    return 'downloaded'
  }
  // O nome muda ANTES de gravar, para o ficheiro levar o nome novo.
  useCircuitStore.setState({ projectName: projectNameFromFile(handle.name) })
  await writeText(handle, toProjectFile(currentProject()))
  setCurrentFile(handle)
  useCircuitStore.getState().markSaved()
  useFileStore.getState().notify('saved-as', handle.name)
  return 'saved'
}

/** Descarrega `<nome>.geii.json` (vai para a pasta de Transferências do browser). */
function download(): void {
  const project = currentProject()
  const blob = new Blob([toProjectFile(project)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = projectFileName(project.name)
  link.click()
  // Dá tempo ao browser para gravar o ficheiro antes de libertar o endereço (com 1 s, num PC
  // lento, o download chegava a ser cancelado).
  setTimeout(() => URL.revokeObjectURL(url), 60_000)
  useCircuitStore.getState().markSaved()
  useFileStore.getState().notify('downloaded', link.download)
}

/** O browser tem a janela "Guardar como" do sistema? (Sem ela, guardar = descarregar.) */
export function canChooseFolder(): boolean {
  return savePicker() !== null
}

/** Abrir: lê o ficheiro escolhido. Devolve null se abriu, ou o motivo da recusa. */
export async function openProjectFile(
  file: File,
  handle: FileHandle | null = null,
): Promise<ProjectFileError | null> {
  const result = parseProjectFile(await file.text())
  if (!result.ok) return result.error
  useCircuitStore.getState().loadProject(result.project)
  setCurrentFile(handle)
  return null
}

/**
 * Abrir com a janela do sistema (lembra-se do ficheiro, para Guardar gravar no mesmo sítio).
 * Devolve 'unsupported' se o browser não a tiver (usa-se então o <input type="file">).
 */
export async function openWithPicker(): Promise<
  | { status: 'unsupported' | 'cancelled' | 'opened' }
  | { status: 'error'; error: ProjectFileError; fileName: string }
> {
  const picker = openPicker()
  if (!picker) return { status: 'unsupported' }
  let handle: FileHandle | undefined
  try {
    ;[handle] = await picker({ multiple: false })
  } catch (error) {
    if (isCancel(error)) return { status: 'cancelled' }
    return { status: 'unsupported' }
  }
  if (!handle) return { status: 'cancelled' }
  const error = await openProjectFile(await handle.getFile(), handle)
  return error ? { status: 'error', error, fileName: handle.name } : { status: 'opened' }
}

/** Pede confirmação antes de deitar fora alterações por guardar (Novo, Abrir). */
export function confirmDiscard(question: string): boolean {
  return !hasUnsavedChanges(useCircuitStore.getState()) || window.confirm(question)
}
