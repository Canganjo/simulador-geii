# Progresso

Atualizado no fim de cada tarefa (regra do CLAUDE.md). Visão por etapa: `docs/Acompanhamento_Simulador_GEII.xlsx`.

Última atualização: 2026-11-16 — issue #54 (selecionar e apagar vários componentes).

| #   | Tarefa                                             | Etapa | Estado | Ramo                          | PR / issue                       |
| --- | -------------------------------------------------- | ----- | ------ | ----------------------------- | -------------------------------- |
| 1   | Limpeza do `.gitignore` (`~$*`, settings locais)   | E0    | feito  | `chore/gitignore`             | PR #8                            |
| 2   | Juntar os ramos no `main` e fechar a E0 (tag v0.1) | E0    | feito  | `chore/gitignore`             | PR #1, #2, #8 · tag `v0.1`       |
| 3   | Painéis recolhíveis (propriedades e resultados)    | E1    | feito  | `feature/paineis-recolhiveis` | PR #9 · fecha issue #7           |
| 4   | Teste de referência 4 (Req = 500 Ω, tol. 0,1 %)    | E6    | feito  | `test/solver-req`             | PR #10 (testes 1–5 OK; 6–7 todo) |
| 5   | Decisão D-008 sobre os formatos de ficheiro        | —     | feito  | `docs/decisao-formatos`       | PR #12 (D-008 🟡 a validar)      |
| 6   | Biblioteca MVP em `src/core/library`               | E4    | feito  | `feature/biblioteca-mvp`      | PR #13 · fecha issue #3          |
| 7   | Grafo do circuito em `src/core/graph`              | E5    | feito  | `feature/grafo`               | PR #14                           |

### Tarefas seguintes (issues da E5 e da E2)

| Issue | Tarefa                                                                                | Etapa | Estado | Ramo                           | PR                  |
| ----- | ------------------------------------------------------------------------------------- | ----- | ------ | ------------------------------ | ------------------- |
| #15   | Netlist: do projeto para o solver (teste 7 OK)                                        | E5    | feito  | `feature/netlist`              | PR #18              |
| #16   | Validações antes do cálculo (erros e avisos)                                          | E5    | feito  | `feature/validacoes`           | PR #19              |
| #17   | LED no modelo simples (Vf + Rs) · teste 6 OK                                          | E5    | feito  | `feature/led-simples`          | PR #20              |
| #4    | Estado do circuito com Zustand + zundo                                                | E2    | feito  | `feature/estado-circuito`      | PR #22              |
| #5    | Arrastar do menu para a zona livre (snap à grelha)                                    | E2    | feito  | `feature/arrastar-componentes` | PR #23              |
| #6    | Selecionar, mover, rodar, duplicar e apagar                                           | E2    | feito  | `feature/selecao-edicao`       | PR #24              |
| #25   | Ligar fios entre terminais (ortogonais)                                               | E2    | feito  | `feature/fios`                 | PR #26              |
| #27   | Layout em telemóvel (iPhone)                                                          | E1    | feito  | `fix/layout-telemovel`         | PR #28              |
| #29   | Trocar de língua: PT · FR · EN                                                        | E1    | feito  | `feature/idiomas`              | PR #30              |
| #32   | Botão Simular e resultados U, I, R, P                                                 | E2    | feito  | `feature/simular`              | PR #33              |
| #35   | Editar os valores e o nome dos componentes                                            | E2    | feito  | `feature/editar-valores`       | PR #36              |
| #37   | Novo, Abrir e Guardar projetos (.geii.json)                                           | E2    | feito  | `feature/guardar-abrir`        | PR #38              |
| #39   | O nome por cima do componente aparece sempre                                          | E2    | feito  | `fix/etiquetas-nomes`          | PR #40              |
| #41   | LED e lâmpada acendem na cena; erros destacados                                       | E7    | feito  | `feature/feedback-cena`        | PR #42              |
| #43   | Opção de debug: número do nó em cada terminal                                         | E3    | feito  | `feature/debug-nos`            | PR #44              |
| #45   | Critérios v1.0: testes de referência e demonstração pela interface                    | E9    | feito  | `test/criterios-v1`            | PR #46              |
| #47   | Publicar a v1.0 do MVP DC (tag e Release)                                             | E9    | feito  | `docs/versao-v1`               | PR #48 · tag `v1.0` |
| #49   | Díodo real (Shockley) com Newton-Raphson no motor                                     | E10   | feito  | `feature/diodo-newton`         | PR #50              |
| #51   | Díodo na interface: menu, cena, propriedades, resultados e JSON                       | E10   | feito  | `feature/diodo-interface`      | PR #52              |
| #53   | Motor do transitório: condensador e bobina (Euler implícito)                          | E10   | feito  | `feature/transitorio-motor`    | PR #56              |
| #54   | Selecionar vários componentes (retângulo, Ctrl+clique, Ctrl+A) e apagá-los de uma vez | E2    | feito  | `feature/selecao-multipla`     | PR #57              |

### Tarefas extra

| Tarefa                                                    | Estado | Ramo                               | PR     |
| --------------------------------------------------------- | ------ | ---------------------------------- | ------ |
| Licença "todos os direitos reservados" (LICENSE)          | feito  | `chore/licenca`                    | PR #11 |
| Painéis redimensionáveis (puxar a borda, como no VS Code) | feito  | `feature/paineis-redimensionaveis` | PR #21 |

## Versões

| Tag    | O quê                                                                                     |
| ------ | ----------------------------------------------------------------------------------------- |
| `v0.1` | Fim da E0: projeto base, CI, deploy, solver MNA DC e layout E1                            |
| `v1.0` | MVP DC completo (E1–E9): editor, fios, simulação U/I/R/P, erros, guardar/abrir, 3 línguas |

Depois da v1.0: revisão do grupo (propostas de edição) e só então a E10 (díodo real, condensador, bobina, AC…).

## Critérios de aceitação v1.0 (secção 19 do dossier)

Cada critério tem pelo menos um teste automático que o prova (corre na CI a cada PR).
Testes E2E em `tests/e2e/`, testes unitários ao lado do código em `src/`.

| Critério (secção 19)                                        | Estado | Prova                                                                                                                 |
| ----------------------------------------------------------- | ------ | --------------------------------------------------------------------------------------------------------------------- |
| Criar um circuito simples sem assistência externa           | ✅     | `referencia.spec.ts` › demonstração (arrastar do menu, ligar, simular) · teste com colegas na revisão final do grupo  |
| Editar e alinhar componentes corretamente                   | ✅     | `app.spec.ts` › mover / apagar / rodar / duplicar, editar valores · snap à grelha em `coordinates.test.ts`            |
| Ligar fios apenas a terminais válidos                       | ✅     | `referencia.spec.ts` › fios (não liga a si próprio, sem fios repetidos) · `circuitStore.test.ts`                      |
| Gerar netlist coerente com o circuito visível               | ✅     | `buildNetlist.test.ts`, `graph.test.ts` · botão **Nós** mostra os nós na cena (`app.spec.ts` › debug)                 |
| Resultados iguais ao cálculo teórico (circuitos conhecidos) | ✅     | os 7 testes da planilha no motor (`mna.test.ts`, `buildNetlist.test.ts`…) **e** pela interface (`referencia.spec.ts`) |
| Detetar e explicar erros básicos                            | ✅     | `validateProject` (sem fonte, sem GND, curto, nó solto) · `app.spec.ts` › simular só uma resistência · demonstração   |
| Guardar e reabrir sem perda                                 | ✅     | `projectFile.test.ts` · `app.spec.ts` › ficheiros (guardar, Novo, abrir, simular → mesmo resultado)                   |
| Interface legível nas resoluções previstas                  | ✅     | `referencia.spec.ts` › 1366×768 e 1920×1080 · `mobile.spec.ts` (telemóvel)                                            |

### Testes de referência da planilha (tolerância 0,1 %)

Valores confirmados pelos testes `referencia.spec.ts` (circuito montado pela interface):

| Nº  | Circuito                           | Grandeza                | Teórico  | Simulador |
| --- | ---------------------------------- | ----------------------- | -------- | --------- |
| 1   | Divisor 12 V, 1 kΩ + 2 kΩ          | Tensão no nó do meio    | 8 V      | 8 V       |
| 2   | Divisor 12 V, 1 kΩ + 2 kΩ          | Corrente                | 4 mA     | 4 mA      |
| 3   | 1 kΩ ∥ 1 kΩ sob 10 V               | Corrente total          | 20 mA    | 20 mA     |
| 4   | 1 kΩ ∥ 1 kΩ sob 10 V               | Resistência equivalente | 500 Ω    | 500 Ω     |
| 5   | Série 12 V, 1 kΩ + 2 kΩ            | Potência em R2          | 32 mW    | 32 mW     |
| 6   | Demo 12 V + 470 Ω + LED (Vf = 2 V) | Corrente no LED         | 21,28 mA | 21,28 mA  |
| 7   | Interruptor aberto                 | Corrente                | 0 A      | 0 A       |

## Já integrado no `main`

| Commit    | O quê                                                                       | PR  |
| --------- | --------------------------------------------------------------------------- | --- |
| `e4e23e2` | Tipos base, netlist, Gauss, solver MNA DC + testes                          | #1  |
| `66b7a66` | Layout E1: barra, menu recolhível, cena ortográfica, botão de conta         | #2  |
| `7ff0fcd` | `.gitignore` + PROGRESSO.md → tag `v0.1` (fim da E0)                        | #8  |
| `d175b3a` | Painéis de propriedades e resultados recolhíveis (Tarefa 3)                 | #9  |
| `e18e08f` | Testes de referência 1 a 5 com tolerância de 0,1 % (Tarefa 4)               | #10 |
| `4c05f6c` | Licença "todos os direitos reservados" (tarefa extra)                       | #11 |
| `ba0a3de` | Decisão D-008: formatos de ficheiro e distribuição (Tarefa 5)               | #12 |
| `8c622d7` | Biblioteca MVP: catálogo, createComponent, validateParams (T6)              | #13 |
| `ad6ec46` | Grafo: terminais ligados → nós elétricos (Tarefa 7)                         | #14 |
| `9c7feb4` | Netlist: projeto → netlist, teste de referência 7 (issue #15)               | #18 |
| `1121d00` | Validações: erros e avisos antes do cálculo (issue #16)                     | #19 |
| `67328b4` | LED (Vf + Rs) e simulateDc: testes de referência 1–7 OK (issue #17)         | #20 |
| `2d4617e` | Painéis redimensionáveis (tarefa extra)                                     | #21 |
| `44e3b7e` | Estado do circuito: Zustand + zundo, Desfazer/Refazer (issue #4)            | #22 |
| `207fe51` | Arrastar componentes do menu para a zona livre (issue #5)                   | #23 |
| `ff127e2` | Selecionar, mover, rodar, duplicar e apagar (issue #6)                      | #24 |
| `74e8349` | Ligar fios entre terminais (issue #25)                                      | #26 |
| `ff4c1af` | Layout em telemóvel (issue #27)                                             | #28 |
| `7515b09` | Trocar de língua: PT · FR · EN (issue #29)                                  | #30 |
| `213cf77` | Plano do botão Simular no PROGRESSO (docs)                                  | #31 |
| `618d566` | Botão Simular e resultados U, I, R, P (issue #32)                           | #33 |
| `49897f0` | Editar os valores e o nome dos componentes (issue #35)                      | #36 |
| `057d724` | Novo, Abrir e Guardar projetos .geii.json (issue #37)                       | #38 |
| `a7dfb8c` | O nome por cima do componente aparece sempre (issue #39)                    | #40 |
| `f64c041` | LED e lâmpada acendem na cena; erros destacados (issue #41)                 | #42 |
| `5a7140e` | Opção de debug: número do nó em cada terminal (issue #43)                   | #44 |
| `8149abd` | Critérios v1.0: testes de referência e demonstração (issue #45)             | #46 |
| `83a2341` | Versão v1.0 do MVP DC: tag e Release (issue #47)                            | #48 |
| `56054e8` | Díodo real (Shockley) com Newton-Raphson no motor (issue #49)               | #50 |
| `a0a99ef` | Díodo na interface: menu, cena, propriedades, resultados e JSON (issue #51) | #52 |
| `1f80066` | Motor do transitório: condensador e bobina (issue #53)                      | #56 |
| (squash)  | Selecionar vários componentes e apagá-los de uma vez (issue #54)            | #57 |
