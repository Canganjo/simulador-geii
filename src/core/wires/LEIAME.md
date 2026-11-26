# src/core/wires

Corrente em cada fio e animação das cargas (só contas, sem Three.js nem React).

- `wireCurrents.ts`: das correntes dos componentes (resultado do solver) para a corrente de cada
  fio, pela lei dos nós. Com fios a mais (malha só de fios), a corrente reparte-se ao contrário do
  comprimento, como num fio real. O GND liga a uma terra comum invisível.
- `chargeMotion.ts`: corrente → velocidade das cargas (escala logarítmica, de 1 µA a 10 A, com
  limite máximo), sentido convencional ou dos eletrões, cor do fio e aviso de curto-circuito.

Responsável: Pessoa 1. TypeScript puro, testado com Vitest (circuitos calculados à mão).
