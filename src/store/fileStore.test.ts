import { beforeEach, describe, expect, it } from 'vitest'
import { useFileStore } from './fileStore'

describe('fileStore', () => {
  beforeEach(() => useFileStore.setState({ fileName: null, notice: null }))

  it('começa sem ficheiro nem aviso', () => {
    expect(useFileStore.getState().fileName).toBeNull()
    expect(useFileStore.getState().notice).toBeNull()
  })

  it('guarda o nome do ficheiro atual', () => {
    useFileStore.getState().setFileName('divisor.geii.json')
    expect(useFileStore.getState().fileName).toBe('divisor.geii.json')
    useFileStore.getState().setFileName(null)
    expect(useFileStore.getState().fileName).toBeNull()
  })

  it('cada aviso tem um id novo, mesmo que seja igual ao anterior', () => {
    const { notify } = useFileStore.getState()
    notify('saved', 'a.geii.json')
    const first = useFileStore.getState().notice
    notify('saved', 'a.geii.json')
    const second = useFileStore.getState().notice
    expect(first).toMatchObject({ kind: 'saved', file: 'a.geii.json' })
    expect(second?.id).not.toBe(first?.id)
    useFileStore.getState().clearNotice()
    expect(useFileStore.getState().notice).toBeNull()
  })
})
