/**
 * Iniciais para o círculo da conta (como no Gmail).
 * "Ana Maria Silva" → "AS" · "Canganjo" → "CA" · "" → "?"
 */
export function initials(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

/**
 * Nome de utilizador para mostrar como "@utilizador" (enquanto não há contas):
 * primeiro nome, sem acentos. "Canganjo Clemente" → "Canganjo" · "Élio" → "Elio"
 */
export function username(fullName: string): string {
  const first = fullName.trim().split(/\s+/)[0] ?? ''
  const plain = first.normalize('NFD').replace(/[̀-ͯ]/g, '')
  return plain || 'convidado'
}
