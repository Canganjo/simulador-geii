/**
 * Prioridade dos pinos no clique.
 *
 * A câmara está inclinada: com o componente rodado na vertical (90° ou 270°), o pino de TRÁS fica
 * escondido atrás do corpo. O raio do rato bate primeiro no corpo e só depois na zona de clique do
 * pino. Para o pino continuar a ligar-se, o corpo deixa passar o evento sempre que o mesmo raio
 * também acerta num pino (marcado com `userData.terminalId`).
 */

/** O que interessa de cada interseção do raio (a do three.js / R3F tem isto e mais). */
export interface Hit {
  object: { userData: Record<string, unknown> }
}

/** ID do primeiro pino atravessado pelo raio, ou null se o raio não acerta em nenhum pino. */
export function terminalHit(hits: readonly Hit[]): string | null {
  for (const hit of hits) {
    const id = hit.object.userData.terminalId
    if (typeof id === 'string') return id
  }
  return null
}
