/**
 * Janela do sistema para Guardar / Abrir ficheiros ("File System Access API").
 *
 * - Chrome e Edge (Windows, macOS, Linux): `showSaveFilePicker` / `showOpenFilePicker` abrem a
 *   janela normal do sistema — o utilizador escolhe a PASTA e o NOME. O programa recebe um
 *   "handle" (uma referência ao ficheiro) e pode voltar a gravar nele sem perguntar outra vez.
 * - Firefox e Safari não têm esta janela: aí Guardar descarrega o ficheiro (Transferências).
 *
 * Estas funções ainda não estão nos tipos do TypeScript, por isso descrevem-se aqui só as partes
 * que usamos, e verifica-se em tempo de execução se existem (sem `any`).
 */

/** O que se escreve num ficheiro aberto para escrita. */
interface WritableFile {
  write(data: string): Promise<void>
  close(): Promise<void>
}

/** Referência a um ficheiro no disco, devolvida pela janela do sistema. */
export interface FileHandle {
  /** Nome do ficheiro (sem a pasta), ex.: "divisor.geii.json". */
  readonly name: string
  createWritable(): Promise<WritableFile>
  getFile(): Promise<File>
}

interface PickerType {
  description: string
  accept: Record<string, string[]>
}

type SavePicker = (options: { suggestedName: string }) => Promise<FileHandle>
type OpenPicker = (options: { multiple: false }) => Promise<FileHandle[]>

/** Tipos de ficheiro mostrados na janela. (".geii.json" acaba em ".json".) */
const PROJECT_TYPES: PickerType[] = [
  { description: 'Projeto do Simulador GEII', accept: { 'application/json': ['.json'] } },
]

function browserFunction(name: string): ((options: unknown) => Promise<unknown>) | null {
  const f: unknown = Reflect.get(window, name)
  return typeof f === 'function'
    ? (options) => Promise.resolve(Reflect.apply(f, window, [options]) as unknown)
    : null
}

/** A janela "Guardar como" do sistema, ou null se o browser não a tiver. */
export function savePicker(): SavePicker | null {
  const f = browserFunction('showSaveFilePicker')
  return f ? async (options) => asHandle(await f({ ...options, types: PROJECT_TYPES })) : null
}

/** A janela "Abrir" do sistema, ou null se o browser não a tiver. */
export function openPicker(): OpenPicker | null {
  const f = browserFunction('showOpenFilePicker')
  if (!f) return null
  return async (options) => {
    const list: unknown = await f({ ...options, types: PROJECT_TYPES })
    return Array.isArray(list) ? list.map(asHandle) : []
  }
}

/** Verifica que o objeto devolvido pelo browser tem o que precisamos. */
function asHandle(value: unknown): FileHandle {
  if (
    typeof value === 'object' &&
    value !== null &&
    typeof Reflect.get(value, 'name') === 'string' &&
    typeof Reflect.get(value, 'createWritable') === 'function' &&
    typeof Reflect.get(value, 'getFile') === 'function'
  ) {
    return value as FileHandle
  }
  throw new Error('O browser devolveu um ficheiro inválido.')
}

/** Verdadeiro se o utilizador fechou a janela sem escolher (botão Cancelar). */
export function isCancel(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError'
}

/** Grava o texto no ficheiro (substitui o conteúdo). */
export async function writeText(handle: FileHandle, text: string): Promise<void> {
  const writable = await handle.createWritable()
  await writable.write(text)
  await writable.close()
}
