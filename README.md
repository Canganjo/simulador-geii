# Simulador 2.5D de Circuitos GEII

Simulador pedagógico de circuitos elétricos, feito por estudantes de **BUT GEII**.

Monta-se o circuito numa grande **zona livre** (como no LTspice), com componentes que têm **aspeto 3D**
vistos de cima por uma câmara ortográfica — daí o nome **2.5D**: a lógica fica num plano, mas os
componentes têm volume, luz e sombra. Ao carregar em **Simular**, um motor de cálculo próprio resolve o
circuito e mostra tensões, correntes e potências; as lâmpadas e os LEDs acendem.

> Estado: **etapa E0** (instalação e base do projeto). Ver o [plano](docs/plano-simulador-geii.md).

## O que o MVP vai fazer

- Zona livre com grelha e _snap_, menu de componentes recolhível, criação ilimitada de componentes.
- Mover, rodar, duplicar, apagar; ligar terminais com fios.
- Componentes: **fonte DC, GND, resistência, interruptor, LED, lâmpada**.
- Resultados **U, I, R, P** por componente.
- Deteção de **circuito aberto, curto-circuito e falta de GND**.
- **Guardar e abrir** projetos em JSON.

Mais tarde: díodo real, condensador, bobina, AC e osciloscópio, 3D completo e realidade virtual (WebXR).

## Como funciona o cálculo (resumo)

O motor usa a **análise nodal modificada (MNA)**, a mesma base do SPICE:

1. Os terminais ligados por fios formam **nós elétricos**; o GND é o nó 0.
2. Cada nó tem uma tensão desconhecida; cada fonte de tensão tem uma corrente desconhecida.
3. Cada componente "carimba" (_stamp_) os seus valores numa matriz → sistema **A · x = b**.
4. O sistema resolve-se por **eliminação de Gauss com pivotagem parcial**.
5. Se a matriz for singular (ex.: falta GND, nó solto), o utilizador recebe uma mensagem clara.

## Instalar e arrancar

Precisas de: [Git](https://git-scm.com/), [Node.js LTS](https://nodejs.org/), [pnpm](https://pnpm.io/)
e [Git LFS](https://git-lfs.com/). No Windows:

```bash
winget install -e --id Git.Git
winget install -e --id OpenJS.NodeJS.LTS
winget install -e --id pnpm.pnpm
winget install -e --id GitHub.GitLFS
```

Depois:

```bash
git clone https://github.com/<utilizador>/simulador-geii.git
cd simulador-geii
git lfs install
pnpm install
pnpm dev
```

Abre <http://localhost:5173> no browser.

### Comandos úteis

| Comando         | O que faz                                 |
| --------------- | ----------------------------------------- |
| `pnpm dev`      | Arranca a app em modo de desenvolvimento  |
| `pnpm test`     | Corre os testes unitários (Vitest)        |
| `pnpm test:e2e` | Corre os testes de interface (Playwright) |
| `pnpm lint`     | Verifica o código (ESLint)                |
| `pnpm format`   | Formata o código (Prettier)               |
| `pnpm build`    | Gera a versão de produção em `dist/`      |

Na primeira vez que correres `pnpm test:e2e`, instala o browser de testes: `pnpm exec playwright install chromium`.

### Extensões recomendadas do VS Code

ESLint, Prettier, Tailwind CSS IntelliSense, Vitest, Playwright, GitLens e Claude Code.

## Estrutura das pastas

| Pasta                 | Conteúdo                                                  | Responsável   |
| --------------------- | --------------------------------------------------------- | ------------- |
| `src/core/model`      | Tipos: Component, Terminal, Wire, Project                 | Pessoa 1      |
| `src/core/library`    | Catálogo dos componentes do MVP                           | Pessoa 1      |
| `src/core/graph`      | Terminais ligados → nós elétricos                         | Pessoa 1      |
| `src/core/netlist`    | Grafo → netlist                                           | Pessoa 1      |
| `src/core/validation` | Erros antes do cálculo (sem GND, curto, circuito aberto…) | Pessoa 1      |
| `src/core/solver`     | Motor de cálculo MNA + Gauss                              | Pessoa 1      |
| `src/store`           | Estado da app (Zustand) + desfazer/refazer                | Pessoa 2      |
| `src/scene`           | Cena 2.5D (React Three Fiber): grelha, componentes, fios  | Pessoa 2      |
| `src/ui`              | Interface (React + Tailwind): barra, menus, painéis       | Pessoa 2      |
| `src/persistence`     | Guardar/abrir JSON (validação Zod)                        | Pessoa 2      |
| `public/models`       | Modelos 3D `.glb`                                         | Pessoa 3      |
| `assets-src`          | Ficheiros Blender `.blend`                                | Pessoa 3      |
| `tests/e2e`           | Testes Playwright                                         | Pessoa 3      |
| `docs`                | Dossier, plano, decisões, manual                          | Pessoas 1 e 3 |
| `.github`             | CI, deploy e modelos de issue                             | Pessoa 1      |

**Pessoa 1** — coordenação + motor de cálculo · **Pessoa 2** — interface + cena 2.5D ·
**Pessoa 3** — modelos 3D, testes e documentação.

Regra de ouro: **`src/core` nunca importa React nem Three.js.** O motor de cálculo é TypeScript puro e
testa-se sozinho, sem abrir a interface. O ESLint dá erro se esta regra for quebrada.

## Stack

TypeScript (strict) · React · Vite · pnpm · Tailwind CSS · Three.js + React Three Fiber + drei ·
Zustand + zundo · Zod · Vitest · Playwright · ESLint + Prettier · lucide-react · GitHub Actions + Pages.

## Como contribuir

Resumo (detalhes em [CONTRIBUTING.md](CONTRIBUTING.md)):

1. Escolhe (ou cria) uma **issue** com objetivo, pasta e critério de "feito".
2. Cria um **ramo** a partir do `main` atualizado: `git switch -c feature/nome-curto`.
3. Faz commits pequenos: `feat(solver): adiciona fontes de tensão`.
4. Antes de enviar: `pnpm lint && pnpm test && pnpm build`.
5. Abre um **pull request** para o `main`; a CI tem de ficar verde e outro membro revê.
6. Depois do merge, apaga o ramo e atualiza o quadro do GitHub Projects.

Ninguém faz push direto para o `main`.

## Licença

Todos os direitos reservados: o código pode ser consultado para avaliação, mas não pode ser copiado,
modificado nem redistribuído sem autorização escrita do autor. Ver [LICENSE](LICENSE).

## Documentação

- [Plano do projeto](docs/plano-simulador-geii.md)
- [Registo de decisões](docs/decisoes.md)
- Dossier técnico (PDF em `docs/`)
- [CLAUDE.md](CLAUDE.md) — regras do projeto para o Claude Code
