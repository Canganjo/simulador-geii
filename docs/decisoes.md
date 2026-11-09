# Registo de decisões

Cada decisão importante (arquitetura, stack, formatos) fica aqui, da mais recente para a mais antiga.
Formato: **data · decisão · porquê · alternativas consideradas · estado**.

Estados: ✅ decidido · 🟡 a validar em reunião · ❌ abandonado.

---

## D-008 · 2026-11-09 · Formatos de ficheiro, exportações e distribuição 🟡 (a validar em reunião)

Detalha e alarga a D-004.

- **Projeto guardado em JSON**, com a extensão **`.geii.json`** (ex.: `divisor-12V.geii.json`):
  - campo **`version`** no topo (hoje `1`), para conseguir abrir ficheiros antigos depois de o formato
    mudar (migração);
  - **validado com Zod** ao abrir: um ficheiro estragado ou de outra versão dá uma mensagem clara, em vez
    de "partir" a aplicação.
- **Guarda só o circuito, não os resultados:**
  - componentes (tipo, nome, valores elétricos, posição, rotação) e fios **pelos IDs dos terminais**
    (`"c3:+"`), nunca por posições;
  - os resultados (U, I, P) **não se guardam**: recalculam-se ao carregar em Simular.
- **Exportações futuras, por prioridade:**
  1. **netlist SPICE `.cir`** — abrir o mesmo circuito no LTspice e comparar os resultados com o nosso
     solver (verificação independente);
  2. **CSV dos resultados** — tabela U, I, R, P por componente, para o Excel ou um relatório;
  3. **PNG / SVG do esquema** — imagem para relatórios e apresentações;
  4. **PDF** — relatório completo (esquema + resultados).
- **Distribuição:**
  - **agora:** aplicação **web** em GitHub Pages (um link, nada a instalar);
  - **mais tarde (opcional):** programa **`.exe`** para Windows com **Tauri**, a partir do mesmo código.
- **Porquê:**
  - `.geii.json` é texto: abre-se em qualquer editor, vê-se bem num diff do Git e a extensão dupla diz
    logo que é um projeto deste simulador (sem deixar de ser JSON);
  - não guardar resultados evita ficheiros com números desatualizados (alguém muda uma resistência e o
    resultado guardado já não corresponde ao circuito);
  - o `.cir` primeiro porque serve para **validar o motor de cálculo** contra uma referência da indústria;
  - Tauri gera um instalador pequeno (alguns MB) porque usa o browser do sistema.
- **Alternativas consideradas:**
  - formato binário próprio — mais pequeno, mas ilegível e difícil de depurar;
  - guardar também os resultados — rápido a reabrir, mas arrisca resultados errados;
  - `.json` simples — funciona, mas não se distingue de outros ficheiros JSON;
  - Electron em vez de Tauri — mais conhecido, mas instaladores de ~100 MB.

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
- **Detalhado e alargado em D-008** (extensão `.geii.json`, o que se guarda, exportações, distribuição).

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
| Convenções de nomes                    | V1…, GND1…, R1…, S1… (interr.), D1… (LED), L1… (lâmpada) |
| Formato de gravação e exportações      | Ver D-008 (`.geii.json`, sem resultados, `.cir` primeiro) |
| Distribuição de funções e calendário   | Pessoa 1/2/3 conforme README; plano de 14 sem. |

Nota sobre os nomes: no SPICE, `L` é a letra das bobinas. Se o simulador ganhar bobinas (fase futura),
será preciso escolher outro prefixo para uma delas (ex.: `LP` para a lâmpada).
