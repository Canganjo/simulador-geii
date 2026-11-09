# Progresso

Atualizado no fim de cada tarefa (regra do CLAUDE.md). Visão por etapa: `docs/Acompanhamento_Simulador_GEII.xlsx`.

Última atualização: 2026-11-10 — painéis redimensionáveis.

| #   | Tarefa                                             | Etapa | Estado | Ramo                          | PR / issue                       |
| --- | -------------------------------------------------- | ----- | ------ | ----------------------------- | -------------------------------- |
| 1   | Limpeza do `.gitignore` (`~$*`, settings locais)   | E0    | feito  | `chore/gitignore`             | PR #8                            |
| 2   | Juntar os ramos no `main` e fechar a E0 (tag v0.1) | E0    | feito  | `chore/gitignore`             | PR #1, #2, #8 · tag `v0.1`       |
| 3   | Painéis recolhíveis (propriedades e resultados)    | E1    | feito  | `feature/paineis-recolhiveis` | PR #9 · fecha issue #7           |
| 4   | Teste de referência 4 (Req = 500 Ω, tol. 0,1 %)    | E6    | feito  | `test/solver-req`             | PR #10 (testes 1–5 OK; 6–7 todo) |
| 5   | Decisão D-008 sobre os formatos de ficheiro        | —     | feito  | `docs/decisao-formatos`       | PR #12 (D-008 🟡 a validar)      |
| 6   | Biblioteca MVP em `src/core/library`               | E4    | feito  | `feature/biblioteca-mvp`      | PR #13 · fecha issue #3          |
| 7   | Grafo do circuito em `src/core/graph`              | E5    | feito  | `feature/grafo`               | PR #14                           |

### Tarefas seguintes (issues da E5)

| Issue | Tarefa                                         | Etapa | Estado | Ramo                  | PR     |
| ----- | ---------------------------------------------- | ----- | ------ | --------------------- | ------ |
| #15   | Netlist: do projeto para o solver (teste 7 OK) | E5    | feito  | `feature/netlist`     | PR #18 |
| #16   | Validações antes do cálculo (erros e avisos)   | E5    | feito  | `feature/validacoes`  | PR #19 |
| #17   | LED no modelo simples (Vf + Rs) · teste 6 OK   | E5    | feito  | `feature/led-simples` | PR #20 |

### Tarefas extra

| Tarefa                                                    | Estado | Ramo                               | PR     |
| --------------------------------------------------------- | ------ | ---------------------------------- | ------ |
| Licença "todos os direitos reservados" (LICENSE)          | feito  | `chore/licenca`                    | PR #11 |
| Painéis redimensionáveis (puxar a borda, como no VS Code) | feito  | `feature/paineis-redimensionaveis` | PR #21 |

## Já integrado no `main`

| Commit    | O quê                                                               | PR  |
| --------- | ------------------------------------------------------------------- | --- |
| `e4e23e2` | Tipos base, netlist, Gauss, solver MNA DC + testes                  | #1  |
| `66b7a66` | Layout E1: barra, menu recolhível, cena ortográfica, botão de conta | #2  |
| `7ff0fcd` | `.gitignore` + PROGRESSO.md → tag `v0.1` (fim da E0)                | #8  |
| `d175b3a` | Painéis de propriedades e resultados recolhíveis (Tarefa 3)         | #9  |
| `e18e08f` | Testes de referência 1 a 5 com tolerância de 0,1 % (Tarefa 4)       | #10 |
| `4c05f6c` | Licença "todos os direitos reservados" (tarefa extra)               | #11 |
| `ba0a3de` | Decisão D-008: formatos de ficheiro e distribuição (Tarefa 5)       | #12 |
| `8c622d7` | Biblioteca MVP: catálogo, createComponent, validateParams (T6)      | #13 |
| `ad6ec46` | Grafo: terminais ligados → nós elétricos (Tarefa 7)                 | #14 |
| `9c7feb4` | Netlist: projeto → netlist, teste de referência 7 (issue #15)       | #18 |
| `1121d00` | Validações: erros e avisos antes do cálculo (issue #16)             | #19 |
| `67328b4` | LED (Vf + Rs) e simulateDc: testes de referência 1–7 OK (issue #17) | #20 |
| (squash)  | Painéis redimensionáveis (tarefa extra)                             | #21 |
