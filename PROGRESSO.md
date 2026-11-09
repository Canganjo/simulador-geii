# Progresso

Atualizado no fim de cada tarefa (regra do CLAUDE.md). Visão por etapa: `docs/Acompanhamento_Simulador_GEII.xlsx`.

Última atualização: 2026-11-09 — Tarefa 1.

| #   | Tarefa                                             | Etapa | Estado   | Ramo                          | PR / issue                         |
| --- | -------------------------------------------------- | ----- | -------- | ----------------------------- | ---------------------------------- |
| 1   | Limpeza do `.gitignore` (`~$*`, settings locais)   | E0    | feito    | `chore/gitignore`             | PR a abrir na Tarefa 2             |
| 2   | Juntar os ramos no `main` e fechar a E0 (tag v0.1) | E0    | em curso | —                             | #1 e #2 integrados; falta tag v0.1 |
| 3   | Painéis recolhíveis (propriedades e resultados)    | E1    | a fazer  | `feature/paineis-recolhiveis` | issue #7                           |
| 4   | Teste de referência 4 (Req = 500 Ω, tol. 0,1 %)    | E6    | a fazer  | `test/solver-req`             | —                                  |
| 5   | Decisão D-008 sobre os formatos de ficheiro        | —     | a fazer  | `docs/decisao-formatos`       | —                                  |
| 6   | Biblioteca MVP em `src/core/library`               | E4    | em curso | `feature/biblioteca-mvp`      | issue #3 (rascunho em `git stash`) |
| 7   | Grafo do circuito em `src/core/graph`              | E5    | a fazer  | `feature/grafo`               | —                                  |

## Já integrado no `main`

| Commit    | O quê                                                               | PR  |
| --------- | ------------------------------------------------------------------- | --- |
| `e4e23e2` | Tipos base, netlist, Gauss, solver MNA DC + testes                  | #1  |
| `66b7a66` | Layout E1: barra, menu recolhível, cena ortográfica, botão de conta | #2  |
