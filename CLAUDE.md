# CLAUDE.md — Simulador 2.5D de Circuitos GEII

Instruções para o Claude Code (e para qualquer pessoa nova no projeto). Ler isto antes de alterar código.

## O projeto

Simulador pedagógico de circuitos elétricos para estudantes de BUT GEII.

- Uma grande **zona livre tipo LTspice** onde se arrastam componentes ilimitados.
- Componentes com **aspeto 3D** vistos por uma **câmara ortográfica** (por isso "2.5D": lógica no plano, visual com volume).
- Um **motor de cálculo elétrico próprio** (análise nodal modificada).

**MVP (só DC):** fonte DC, GND, resistência, interruptor, LED e lâmpada · resultados U, I, R, P · deteção de
circuito aberto, curto-circuito e falta de GND · guardar/abrir projetos em JSON.

**Depois do MVP (não começar antes):** díodo real (Newton-Raphson), condensador, bobina (transitório), AC,
osciloscópio, 3D completo, VR (WebXR).

Documentos de referência em `docs/`: dossier técnico (PDF), `plano-simulador-geii.md`, `decisoes.md`,
planilha de acompanhamento (com os testes de referência).

## Stack (decidida — não mudar sem acordo do grupo, registar em docs/decisoes.md)

| Parte            | Ferramenta                                                  |
| ---------------- | ----------------------------------------------------------- |
| Linguagem        | TypeScript **strict** (fixado em 6.0, ver decisoes.md)      |
| Interface        | React 19 + Tailwind CSS 4                                   |
| Cena 2.5D        | Three.js + React Three Fiber + @react-three/drei            |
| Estado           | Zustand + zundo (desfazer/refazer)                          |
| Validação JSON   | Zod                                                         |
| Motor de cálculo | TypeScript puro: MNA + eliminação de Gauss com pivotagem    |
| Build / dev      | Vite, pnpm                                                  |
| Testes           | Vitest (unitários), Playwright (E2E)                        |
| Qualidade        | ESLint + Prettier                                           |
| Ícones           | lucide-react (interface), SVG IEC (símbolos de componentes) |
| CI / publicação  | GitHub Actions (lint + testes + build), GitHub Pages        |
| Modelos 3D       | Blender → .glb (Git LFS para .blend e .glb)                 |

## Estrutura das pastas e responsáveis

```
src/
  core/            Pessoa 1 — núcleo puro, SEM React/Three.js
    model/         tipos: Component, Terminal, Wire, Project
    library/       catálogo de componentes (dados)
    graph/         terminais ligados → nós elétricos
    netlist/       grafo → netlist
    validation/    erros antes do cálculo (sem fonte, sem GND, curto…)
    solver/        MNA + Gauss (depois: díodo, transitório, AC)
  store/           Pessoa 2 — Zustand + zundo
  scene/           Pessoa 2 — React Three Fiber: grelha, componentes, fios
  ui/              Pessoa 2 — React: barra, menus, painéis
  persistence/     Pessoa 2 — JSON + Zod (formato combinado com a Pessoa 1)
public/models/     Pessoa 3 — modelos .glb
assets-src/        Pessoa 3 — ficheiros .blend
tests/e2e/         Pessoa 3 — testes Playwright
docs/              Pessoa 1 (coordenação) + Pessoa 3 (manual, documentação)
.github/           Pessoa 1 — CI, deploy, modelos de issue
CLAUDE.md          Pessoa 1
```

Testes unitários ficam **ao lado do código**: `src/core/solver/mna.ts` → `src/core/solver/mna.test.ts`.

### Direção das dependências

```
ui ──► store ──► core ◄── persistence
scene ─┘
```

- `src/core` **nunca** importa React, Three.js, Zustand, nem `ui/`, `scene/`, `store/`, `persistence/`.
  Há uma regra ESLint (`no-restricted-imports` em `eslint.config.js`) que falha se isto acontecer.
- A interface e a cena só leem/alteram o estado. Ao clicar em Simular: estado → core → resultados.
- Os fios guardam **IDs de terminais**, nunca posições.

## Comandos

```bash
pnpm install        # instalar dependências
pnpm dev            # servidor local (http://localhost:5173)
pnpm test           # testes unitários (Vitest), uma vez
pnpm test:watch     # Vitest em modo contínuo
pnpm test:e2e       # testes Playwright (faz build + preview)
pnpm lint           # ESLint
pnpm format         # Prettier (corrige)
pnpm format:check   # Prettier (só verifica, usado na CI)
pnpm typecheck      # tsc sem gerar ficheiros
pnpm build          # tsc + build de produção em dist/
```

Antes de dar uma tarefa por terminada: `pnpm lint && pnpm test && pnpm build` têm de passar.

## Regras de trabalho

1. **Tarefas pequenas** (1 a 3 horas). Uma issue = um ramo = um pull request.
2. **Testes obrigatórios para qualquer alteração em `src/core/solver`** (e recomendados em todo o `src/core`):
   cada teste usa um circuito **calculado à mão**, com o cálculo escrito em comentário no teste.
   Comparar números com tolerância (`toBeCloseTo`), nunca `toBe` para floats.
3. **TypeScript strict**: sem `any` (usar `unknown` + validação), sem `@ts-ignore`, sem `!` desnecessários.
4. **Commits** no formato `tipo(escopo): descrição` em português, no imperativo/presente:
   - tipos: `feat` (nova funcionalidade), `fix` (correção), `docs` (documentação);
     também aceites: `test`, `refactor`, `chore`, `ci`.
   - escopos usuais: `solver`, `graph`, `netlist`, `validation`, `model`, `library`, `ui`, `scene`,
     `store`, `persistence`, `models3d`, `e2e`, `ci`, `docs`.
   - ex.: `feat(solver): adiciona fontes de tensão`, `fix(scene): fios seguem o componente ao mover`.
5. **Nunca trabalhar diretamente no `main`**. Ramos: `feature/…`, `fix/…`, `docs/…`.
6. Decisões importantes (de arquitetura ou de stack) → `docs/decisoes.md`.
7. Unidades SI em todo o core (V, A, Ω, W). Formatação com prefixos (mA, kΩ) só na interface.
8. Primeiro funcional com caixas simples, depois bonito com modelos 3D.
9. Terminar o MVP DC antes de AC, 3D completo ou VR.
10. **No fim de cada tarefa, atualizar o `PROGRESSO.md`** (estado, ramo e PR de cada tarefa) e fazer
    commit dele no ramo da tarefa.
11. Não alterar a planilha `docs/Acompanhamento_Simulador_GEII.xlsx` nem os PDF de `docs/`.

## Notas para o Claude Code

- Para tarefas não triviais, propor primeiro um plano curto e esperar confirmação.
- Explicar as alterações em português simples (o grupo está a aprender e tem de apresentar o projeto).
- Não alterar ficheiros em `docs/` exceto `docs/decisoes.md`, salvo pedido explícito.
- Não mudar a stack nem as versões principais sem perguntar.
- Respeitar a pasta e o responsável de cada tarefa; se uma alteração atravessa várias pastas, dizê-lo.
