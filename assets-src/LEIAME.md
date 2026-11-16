# assets-src

Ficheiros fonte do Blender (`.blend`), um por componente, com o mesmo nome do `.glb`
(ex.: `resistor.blend` → `public/models/resistor.glb`). Guardados com **Git LFS**.

Responsável: Pessoa 3.

As medidas, os nomes dos materiais (`luz`, `corpo`), os limites e os passos de exportação estão
na ficha técnica: [`public/models/LEIAME.md`](../public/models/LEIAME.md).

Resumo rápido:

- 1 m no Blender = 1 quadrado da grelha; origem no centro, no chão (Z = 0).
- Dipolos ao longo de X, terminais em X = −1 e X = +1; GND com o terminal em Y = +1.
- ≤ 2 000 triângulos, ≤ 200 KB; exportar glTF Binary com +Y Up, sem Draco.
- Antes do primeiro `git add` de um `.blend`/`.glb`, confirmar que o Git LFS está instalado:
  `git lfs install` (só uma vez por computador).
