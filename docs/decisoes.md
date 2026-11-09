# Registo de decisões

Cada decisão importante (arquitetura, stack, formatos) fica aqui, da mais recente para a mais antiga.
Formato: **data · decisão · porquê · alternativas consideradas · estado**.

Estados: ✅ decidido · 🟡 a validar em reunião · ❌ abandonado.

---

## D-007 · 2026-11-09 · TypeScript fixado em 6.0 (não 7.0) ✅

- **Decisão:** usar `typescript ~6.0` em vez do 7.0 que o modelo do Vite instala.
- **Porquê:** o `typescript-eslint` (necessário para o ESLint ler TypeScript) só suporta até 6.0. O
  TypeScript 7 (versão nativa, mais rápida) ainda não é compatível. A linguagem e o modo strict são iguais.
- **Revisitar:** quando o `typescript-eslint` suportar o TypeScript 7.

## D-006 · 2026-11-09 · Câmara ortográfica estrita no MVP 🟡 (proposta, confirmar em reunião)

- **Decisão:** câmara ortográfica vista de cima, ligeiramente inclinada para se ver o volume dos
  componentes; sem perspetiva no MVP.
- **Porquê:** grelha e snap ficam exatos, os fios ortogonais ficam legíveis.
- **Alternativa:** ligeira perspetiva (dossier, secção 22) — pode ser uma opção mais tarde.

## D-005 · 2026-11-09 · Análise nodal modificada (MNA) como base do solver ✅

- **Decisão:** um único método — MNA com eliminação de Gauss e pivotagem parcial — para todos os
  circuitos DC lineares (série, paralelo, misto, várias fontes).
- **Porquê:** é a base do SPICE/LTspice; trata tudo de uma vez; estende-se a díodos (Newton-Raphson),
  transitórios (Euler implícito) e AC (números complexos).
- **Alternativa:** regras de série/paralelo — não funcionam para circuitos mistos com várias fontes.
- **Solver escrito à mão** (sem biblioteca): o grupo tem de saber explicá-lo. Python/NumPy só para
  verificar resultados.

## D-004 · 2026-11-09 · Formato de gravação: JSON com versão + Zod ✅

- **Decisão:** projetos guardados em `.json` com campo `version`; validados com Zod ao abrir.
- **Porquê:** legível, fácil de testar, e o campo `version` permite migrar ficheiros antigos.

## D-003 · 2026-11-09 · O núcleo (`src/core`) não depende da interface ✅

- **Decisão:** `src/core` é TypeScript puro; não importa React, Three.js, Zustand nem `ui/scene/store`.
  Verificado por uma regra ESLint (`no-restricted-imports`).
- **Porquê:** o motor testa-se sozinho com Vitest; pode ser reutilizado (desktop, VR, outra linguagem).

## D-002 · 2026-11-09 · Stack web: TypeScript + React + Three.js (R3F) em vez de Unity ✅

- **Decisão:** aplicação web (Vite + React + React Three Fiber), publicada em GitHub Pages.
- **Porquê:** partilhar = enviar um link; o editor (menus, painéis) é muito mais fácil em React; quase
  tudo é código, por isso a IA (Claude Code) ajuda muito mais; ferramentas leves.
- **Alternativas:** Unity (melhor para VR, mas pesado e muito trabalho manual no editor), Tauri
  (opcional mais tarde para versão desktop com o mesmo código).
- **Nota:** o dossier técnico ainda refere Unity (Canvas, prefabs) — essas partes foram substituídas por
  esta decisão.

## D-001 · 2026-11-09 · Gestor de pacotes: pnpm ✅

- **Decisão:** pnpm (não npm/yarn). **Porquê:** mais rápido, ocupa menos disco, lockfile fiável.

---

## Decisões ainda a validar em reunião (dossier, secção 22) 🟡

| Tema                                   | Proposta atual                                 |
| -------------------------------------- | ---------------------------------------------- |
| Nome final da aplicação                | "Simulador 2.5D de Circuitos GEII" (provisório)|
| Posição exata do menu de componentes   | Esquerda, recolhível                            |
| Lista final do MVP                     | Fonte DC, GND, R, interruptor, LED, lâmpada     |
| Fios ortogonais ou curvos              | Ortogonais                                      |
| Convenções de nomes                    | R1, R2…, V1…, D1…, L1… (lâmpada), S1… (interr.) |
| Distribuição de funções e calendário   | Pessoa 1/2/3 conforme README; plano de 14 sem. |
