# Progresso

Atualizado no fim de cada tarefa (regra do CLAUDE.md). Visão por etapa: `docs/Acompanhamento_Simulador_GEII.xlsx`.

Última atualização: 2026-11-09 — Tarefa 5.

| #   | Tarefa                                             | Etapa | Estado   | Ramo                          | PR / issue                         |
| --- | -------------------------------------------------- | ----- | -------- | ----------------------------- | ---------------------------------- |
| 1   | Limpeza do `.gitignore` (`~$*`, settings locais)   | E0    | feito    | `chore/gitignore`             | PR #8                              |
| 2   | Juntar os ramos no `main` e fechar a E0 (tag v0.1) | E0    | feito    | `chore/gitignore`             | PR #1, #2, #8 · tag `v0.1`         |
| 3   | Painéis recolhíveis (propriedades e resultados)    | E1    | feito    | `feature/paineis-recolhiveis` | PR #9 · fecha issue #7             |
| 4   | Teste de referência 4 (Req = 500 Ω, tol. 0,1 %)    | E6    | feito    | `test/solver-req`             | PR #10 (testes 1–5 OK; 6–7 todo)   |
| 5   | Decisão D-008 sobre os formatos de ficheiro        | —     | feito    | `docs/decisao-formatos`       | PR #12 (D-008 🟡 a validar)        |
| 6   | Biblioteca MVP em `src/core/library`               | E4    | em curso | `feature/biblioteca-mvp`      | issue #3 (rascunho em `git stash`) |
| 7   | Grafo do circuito em `src/core/graph`              | E5    | a fazer  | `feature/grafo`               | —                                  |

### Tarefas extra

| Tarefa                                           | Estado | Ramo            | PR     |
| ------------------------------------------------ | ------ | --------------- | ------ |
| Licença "todos os direitos reservados" (LICENSE) | feito  | `chore/licenca` | PR #11 |

## Já integrado no `main`

| Commit    | O quê                                                               | PR  |
| --------- | ------------------------------------------------------------------- | --- |
| `e4e23e2` | Tipos base, netlist, Gauss, solver MNA DC + testes                  | #1  |
| `66b7a66` | Layout E1: barra, menu recolhível, cena ortográfica, botão de conta | #2  |
| `7ff0fcd` | `.gitignore` + PROGRESSO.md → tag `v0.1` (fim da E0)                | #8  |
| `d175b3a` | Painéis de propriedades e resultados recolhíveis (Tarefa 3)         | #9  |
| `e18e08f` | Testes de referência 1 a 5 com tolerância de 0,1 % (Tarefa 4)       | #10 |
| `4c05f6c` | Licença "todos os direitos reservados" (tarefa extra)               | #11 |
| (squash)  | Decisão D-008: formatos de ficheiro e distribuição (Tarefa 5)       | #12 |
