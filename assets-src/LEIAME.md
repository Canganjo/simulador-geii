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

## Gerar os modelos com o script

`build_models.py` constrói os 9 componentes (e o interruptor aberto) no Blender a partir de código (formas simples:
cilindros, esferas, caixas e tubos para as patas), guarda cada `.blend` aqui e exporta cada `.glb`
para `public/models/`. No fim mostra, para cada modelo, os triângulos, o tamanho e as medidas.

```bash
"C:/Program Files/Blender Foundation/Blender 5.3/blender.exe" --background --factory-startup --python assets-src/build_models.py
```

Só alguns componentes: acrescentar `-- resistor led` no fim. Depois de correr, `pnpm test`
verifica os `.glb` contra a ficha técnica (`src/scene/models3d.files.test.ts`).
