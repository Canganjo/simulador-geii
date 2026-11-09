# Como contribuir

Fluxo de trabalho do grupo. Curto de propósito: se tiveres dúvidas, pergunta na reunião semanal.

## 1. Antes de começar

- Cada tarefa tem uma **issue** no GitHub (modelo "Tarefa"): objetivo, pasta, critério de "feito".
- Atribui a issue a ti e passa-a para **Em curso** no quadro do GitHub Projects.
- Tarefas pequenas: **1 a 3 horas**. Se for maior, divide em várias issues.

## 2. Criar um ramo

```bash
git switch main
git pull
git switch -c feature/nome-curto     # ou fix/... ou docs/...
```

Exemplos: `feature/grelha-snap`, `fix/fios-soltos`, `docs/manual-utilizador`.

## 3. Trabalhar

- Mexe sobretudo na **tua pasta** (ver a tabela do README). Se precisares de mudar a pasta de outra
  pessoa, avisa-a primeiro.
- `src/core` não importa React nem Three.js (o ESLint verifica).
- **Qualquer alteração ao solver precisa de um teste** com um circuito calculado à mão
  (cálculo escrito em comentário no teste).
- Commits pequenos e frequentes, no formato:

  ```
  feat(escopo): descrição     → nova funcionalidade
  fix(escopo): descrição      → correção de erro
  docs(escopo): descrição     → documentação
  ```

  Também se usam `test`, `refactor`, `chore`, `ci`. Ex.: `fix(scene): fios seguem o componente ao mover`.

## 4. Antes de abrir o pull request

```bash
pnpm lint
pnpm test
pnpm build
```

Os três têm de passar. Se mexeste na interface, abre a app (`pnpm dev`) e experimenta.

## 5. Pull request

```bash
git push -u origin feature/nome-curto
gh pr create --fill
```

- No texto do PR: o que mudou, como testar, e `Closes #<número da issue>`.
- A **CI** (lint + testes + build) tem de ficar verde.
- **Outro membro revê** e aprova. Quem revê lê o código, corre a app se for preciso, e comenta.
- Merge com **Squash and merge**; depois apaga o ramo.

## 6. Depois do merge

```bash
git switch main
git pull
git branch -d feature/nome-curto
```

Move a issue para **Feito**.

## Decisões

Uma decisão que muda a arquitetura, a stack ou o formato dos ficheiros vai para `docs/decisoes.md`
(data, decisão, porquê, alternativas).
