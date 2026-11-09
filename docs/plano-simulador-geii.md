# Plano de projeto – Simulador 2.5D de Circuitos GEII

9 de novembro de 2026

## Resumo

Recomendação: fazer o simulador como **aplicação web em TypeScript**, com React para a interface e Three.js (via React Three Fiber) para a cena 2.5D. Mais tarde, a mesma aplicação pode virar um programa desktop com Tauri e chegar à realidade virtual com WebXR.

O objetivo do dossier é um simulador pedagógico: zona livre tipo LTspice, componentes com aspeto 3D, motor de cálculo DC fiável e evolução até 3D completo e VR. A maior parte do trabalho é um **editor** (menus, painéis, arrastar, ligar fios) e um **motor de cálculo**. As duas coisas fazem-se muito bem em código web puro.

Esta escolha também encaixa no método de trabalho: tudo é texto e código. Assim, o Claude Code pode escrever, testar e corrigir quase tudo diretamente no repositório GitHub. Com Unity, grande parte do trabalho (cenas, prefabs, Canvas) é feita à mão no editor, onde a IA ajuda muito menos.

## Web ou desktop

Escolha: **web primeiro, desktop depois (opcional)**. O mesmo código serve as duas versões, por isso não é preciso decidir já entre uma e outra.

| Critério | Web (React + Three.js) | Desktop Unity (C#) | Desktop Tauri (web empacotado) |
| --- | --- | --- | --- |
| Partilhar com professores e colegas | Um link, nada a instalar | Instalador por SO, ou build WebGL pesado | Instalador leve |
| Interface tipo editor (painéis, menus, formulários) | Muito forte (React) | Trabalhoso (Canvas UI) | Igual ao web |
| Cena 3D / 2.5D | Bom (Three.js) | Excelente | Igual ao web |
| Realidade virtual (fase futura) | Possível (WebXR) | Excelente | Limitado |
| Ajuda da IA (Claude Code) | Quase tudo é código: a IA faz muito | Muito trabalho manual no editor | Igual ao web |
| Peso das ferramentas | Leve (VS Code + Node.js) | Unity Hub + editor, vários GB | Leve + Rust |
| Testes automáticos do solver | Simples (Vitest) | Possível, mais pesado | Igual ao web |

O ponto fraco do web é a VR: o Unity é mais maduro nisso. Mas o dossier diz que a VR só vem depois de um MVP estável. Se um dia for mesmo preciso, o motor de cálculo em TypeScript pode ser reutilizado ou reescrito em C# a partir de testes já validados.

## Linguagens e frameworks

Uma só linguagem para tudo: **TypeScript** (JavaScript com tipos). Os tipos evitam muitos erros no modelo de dados (componentes, terminais, nós) e ajudam a IA a escrever código correto.

| Parte do projeto | Ferramenta | Papel |
| --- | --- | --- |
| Linguagem | TypeScript | Todo o código: interface, cena, motor de cálculo |
| Interface | React | Barra superior, menu de componentes, painéis de propriedades e resultados |
| Estilo | Tailwind CSS | Layout rápido e responsivo, painéis recolhíveis |
| Cena 2.5D | Three.js + React Three Fiber + drei | Câmara ortográfica, grelha, modelos 3D, luzes, zoom e pan |
| Estado da aplicação | Zustand (+ zundo para desfazer/refazer) | Lista de componentes, fios, seleção, histórico |
| Motor de cálculo | TypeScript puro (sem biblioteca) | Análise nodal modificada (MNA), eliminação de Gauss |
| Validação de ficheiros | Zod | Verifica o JSON ao abrir um projeto |
| Build e servidor local | Vite | Arranque rápido, recarga instantânea |
| Testes unitários | Vitest | Testar o solver com circuitos conhecidos |
| Testes de interface | Playwright | Simular um utilizador: arrastar, ligar, simular |
| Qualidade do código | ESLint + Prettier | Estilo comum para todo o grupo |
| Modelos 3D | Blender → glTF/GLB | Componentes low-poly exportados para a web |
| Ícones da interface | Lucide (lucide-react) + SVG IEC | Ícones vetoriais no mesmo estilo |
| Desktop (opcional) | Tauri | Transformar a app web num programa Windows/macOS/Linux |
| VR (futuro) | WebXR (@react-three/xr) | Laboratório virtual com headset |

Porquê escrever o solver à mão? Porque é um projeto GEII: o grupo tem de saber explicar a análise nodal. O Python (NumPy, PySpice) serve ao lado, para verificar os resultados do solver e para aprender o método num notebook.

## Ambientes de desenvolvimento

Ambiente principal: **VS Code + Claude Code + Node.js + Git**. É tudo gratuito e funciona em Windows, macOS e Linux.

| Ferramenta | Para quê | Notas |
| --- | --- | --- |
| Visual Studio Code | Editor de código | Extensões: ESLint, Prettier, Tailwind CSS IntelliSense, Vitest, GitLens, Claude Code |
| Claude Code | Agente de IA que escreve e testa código no projeto | No terminal ou na extensão do VS Code |
| Node.js (versão LTS) + pnpm | Executar o Vite, os testes e instalar bibliotecas | pnpm é mais rápido que npm; npm também serve |
| Git + conta GitHub | Guardar versões e trabalhar em grupo | GitHub Desktop é opcional |
| Google Chrome ou Edge | Testar a app | DevTools + extensão React Developer Tools |
| Blender | Modelar os componentes 3D | Exportar em .glb |
| GitHub Copilot (opcional) | Autocompletar no VS Code | Gratuito com o GitHub Student Developer Pack |

## Arquitetura do software

Regra principal: o motor de cálculo fica separado de tudo o resto. Ele recebe dados (componentes e ligações) e devolve números. Assim pode ser testado sozinho, sem abrir a interface.

Camadas:

1. **Interface (React)**: barra superior, menu de componentes, painel de propriedades, painel de resultados.
2. **Cena 2.5D (React Three Fiber)**: grelha e snap, arrastar e largar, terminais, fios, LEDs e lâmpadas que acendem.
3. **Estado da aplicação (Zustand)**: modelo do circuito (componentes, fios, seleção) e histórico desfazer/refazer. Ligado a **Guardar/abrir** (JSON verificado com Zod).
4. **Núcleo de cálculo (TypeScript puro, testado com Vitest)**: Grafo de nós → Netlist → Validação → Solver MNA.

A interface e a cena só leem e alteram o estado; ao clicar em Simular, o estado passa pelo núcleo e recebe os resultados U, I, P de volta.

```
simulador-geii/
├─ src/
│  ├─ core/            # núcleo puro, sem React
│  │  ├─ model/        # tipos: Component, Terminal, Wire, Project
│  │  ├─ library/      # catálogo de componentes (dados)
│  │  ├─ graph/        # terminais ligados → nós elétricos
│  │  ├─ netlist/
│  │  ├─ validation/
│  │  └─ solver/       # MNA, Gauss; depois díodo, AC, transiente
│  ├─ store/           # Zustand: estado + desfazer/refazer
│  ├─ scene/           # React Three Fiber: grelha, componentes, fios
│  ├─ ui/              # React: barra, menus, painéis
│  └─ persistence/     # JSON + Zod
├─ public/models/      # modelos 3D .glb
├─ assets-src/         # ficheiros .blend (Git LFS)
├─ tests/e2e/          # testes Playwright
├─ docs/               # dossier, plano, decisões, manual
└─ CLAUDE.md           # regras do projeto para o Claude Code
```

| Módulo do dossier (secção 9) | Pasta |
| --- | --- |
| Gestão da UI, Painel de propriedades | src/ui |
| Biblioteca de componentes | src/core/library + src/ui |
| Drag & Drop, Grelha, Seleção, Terminais, Fios, Feedback visual | src/scene + src/store |
| Grafo do circuito | src/core/graph |
| Gerador de netlist | src/core/netlist |
| Validação | src/core/validation |
| Motor de cálculo | src/core/solver |
| Guardar/Carregar | src/persistence |
| Testes | ficheiros *.test.ts + tests/e2e |

## Motor de cálculo

Método: **análise nodal modificada (MNA)**, a mesma base do SPICE e do LTspice. Trata de uma só vez série, paralelo, circuitos mistos e várias fontes.

Cada nó (exceto o GND) tem uma tensão desconhecida, e cada fonte de tensão tem uma corrente desconhecida. Cada componente acrescenta valores numa matriz (o "stamp"). Depois resolve-se o sistema linear A · x = b por eliminação de Gauss com pivotagem parcial. Uma matriz singular indica um circuito sem solução única (falta de GND, nó solto): mensagem clara ao utilizador.

Fases do motor:

1. **DC linear**: resistência, fonte DC, GND, interruptor, lâmpada como resistência. Resultados U, I, P por componente.
2. **Validação antes do cálculo**: sem fonte, sem GND, terminais soltos, curto direto na fonte, valores inválidos.
3. **Díodo e LED**: modelo não linear, Newton-Raphson. Começar por um modelo simples (tensão de limiar + resistência).
4. **Condensador e bobina em transitório**: Euler implícito, passo fixo, gráfico.
5. **AC**: números complexos e impedâncias, depois osciloscópio virtual.

Cada fase só começa quando a anterior passa nos testes (circuitos calculados à mão, ver a planilha "Testes de referência").

## GitHub

O GitHub é necessário: projeto de grupo, com IA a escrever código.

- Um repositório (ex.: simulador-geii), com todos os membros como colaboradores.
- Ramo main protegido; cada tarefa tem o seu ramo (feature/drag-drop, fix/fios-soltos…).
- Issues: uma por tarefa, com critério de "feito".
- GitHub Projects: quadro A fazer / Em curso / Em revisão / Feito.
- Pull requests revistos por outro membro.
- GitHub Actions: lint + testes + build a cada PR.
- GitHub Pages: publicação automática da versão main.
- Git LFS para .blend e .glb.
- Tags de versão (v0.1, v0.5, v1.0) no fim das etapas.

Mensagens de commit: feat(solver): adiciona fontes de tensão; fix(fios): fios seguem o componente ao mover.

## Plano etapa por etapa

O MVP cabe em cerca de 14 semanas indicativas, com a interface e o núcleo de cálculo em paralelo.

| Etapa | Semanas | Trilha |
| --- | --- | --- |
| E0 – Definição e instalação | S1–S2 | Grupo todo (v0.1 no fim) |
| E1 – Layout | S3 | Interface e cena |
| E2 – Interação | S4–S5 | Interface e cena |
| E3 – Ligações | S6–S7 | Interface e cena |
| E4 – Dados | S3–S4 | Núcleo |
| E5 – Circuito | S5–S6 | Núcleo |
| E6 – Cálculo DC | S7–S9 | Núcleo (v0.5 no fim) |
| E7 – Feedback e integração | S10–S11 | Interface e cena |
| E8 – Persistência | S12 | Interface e cena |
| E9 – Testes e demonstração | S13–S14 | Grupo todo (v1.0 MVP) |
| E10 – Evolução | depois do MVP | — |

1. **E0** – Fechar as decisões da secção 22 do dossier; instalar o ambiente; repositório, CLAUDE.md, CI. Feito quando: todos fazem clone, pnpm dev abre a app vazia, o link GitHub Pages funciona.
2. **E1** – Barra superior, menu recolhível, zona livre com câmara ortográfica e grelha, painéis vazios.
3. **E2** – Arrastar do menu, snap, seleção, rodar, duplicar, apagar, zoom, pan, desfazer/refazer (componentes como caixas simples).
4. **E3** – Terminais clicáveis, fios ortogonais que seguem os componentes; opção de debug com o número do nó.
5. **E4** – Tipos Component, Terminal, Wire, Project; biblioteca MVP; painel de propriedades ligado ao modelo.
6. **E5** – Grafo, netlist, validações da secção 13 do dossier, com testes.
7. **E6** – Solver MNA com Gauss; resultados U, I, P; testes de referência OK (v0.5).
8. **E7** – Botão Simular, painel de resultados, lâmpada/LED acendem, mensagens de erro, modelos 3D do Blender.
9. **E8** – Novo, guardar e abrir em JSON com versão do formato e Zod.
10. **E9** – Testes Playwright, teste com colegas, critérios da secção 19 (v1.0).
11. **E10** – Instrumentos, díodo real, condensador e bobina, AC e osciloscópio, 3D completo, VR com WebXR.

## Trabalhar com Claude, Claude Code e outras IAs

| Ferramenta | Papel no projeto |
| --- | --- |
| Claude (chat) | Arquitetura, explicar conceitos, preparar tarefas, rever código, documentação |
| Claude Code | Escrever o código no repositório, executar testes, corrigir erros, commits |
| GitHub Copilot | Autocompletar no VS Code |
| ChatGPT ou Gemini | Segunda opinião, verificar um cálculo |
| IA de imagem / Canva (opcional) | Imagens decorativas e apresentação |

Ciclo para cada tarefa:

1. Criar a issue com objetivo e critério de "feito".
2. Criar o ramo: git switch -c feature/nome-da-tarefa.
3. No Claude Code, pedir primeiro um plano (modo plan) e corrigi-lo.
4. Implementar com testes, em passos pequenos.
5. Testar na app (pnpm dev) e ler o código.
6. Pull request, revisão por um colega, CI verde.
7. Merge no main e atualizar o quadro.

Regras:

- Uma tarefa pequena de cada vez (1 a 3 horas).
- CLAUDE.md na raiz com o projeto, a stack, as pastas e as regras.
- Nenhuma alteração ao solver sem teste com um circuito calculado à mão.
- Commits frequentes.
- Decisões importantes em docs/decisoes.md.

## Organização do grupo e acompanhamento

Tarefas do dia a dia no quadro GitHub Projects; visão geral por etapa na planilha Acompanhamento_Simulador_GEII.xlsx.

| Função | Pastas principais | Etapas |
| --- | --- | --- |
| Coordenação e integração | CLAUDE.md, docs, CI | E0, E7, E9 |
| UI/UX | src/ui | E1, E4 (painel) |
| Interação e cena | src/scene, src/store | E2, E3 |
| Conectividade e motor de cálculo | src/core | E4, E5, E6 |
| Assets 3D | assets-src, public/models | E7 |
| Testes e documentação | tests, docs | E5, E6, E9 |

Uma reunião curta por semana (15–30 min).

## Riscos e regras de ouro

| Risco | Medida |
| --- | --- |
| A IA escreve código que ninguém percebe | Tarefas pequenas, revisão em PR, pedir explicações |
| Resultados elétricos errados | Testes Vitest com circuitos calculados à mão, CI obrigatória |
| Fios não seguem os componentes | Fios guardam IDs de terminais, não posições |
| Matriz singular | Validação antes do solver e mensagem clara |
| Projetos guardados deixam de abrir | Campo version no JSON e verificação Zod |
| Modelos 3D pesados | Low-poly, .glb comprimido |
| Conflitos no Git | Um ramo por tarefa, merges pequenos |

- O núcleo (src/core) nunca importa React nem Three.js.
- Nada entra no main sem testes a passar.
- Primeiro funcional com caixas simples, depois bonito com modelos 3D.
- Terminar o MVP DC antes de AC, 3D completo ou VR.
