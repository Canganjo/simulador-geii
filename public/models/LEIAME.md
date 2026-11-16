# public/models — ficha técnica dos modelos 3D

Modelos 3D exportados do Blender em `.glb` (low-poly). Guardados com **Git LFS**.
Os ficheiros fonte `.blend` ficam em `assets-src/` (ver `assets-src/LEIAME.md`).

Responsável: Pessoa 3.

Os 7 modelos atuais são **gerados por um script do Blender**: `assets-src/build_models.py`
(ver `assets-src/LEIAME.md`). Para mudar um modelo, alterar o script e voltar a corrê-lo, ou abrir
o `.blend` em `assets-src/`, melhorar à mão e exportar como na secção 5.

Enquanto um componente não tiver modelo, a aplicação mostra a **caixa colorida** de sempre.
Se um `.glb` faltar ou estiver estragado, também volta à caixa — nada se parte.

## 1. Nome dos ficheiros (um por tipo de componente)

| Componente  | Ficheiro        |
| ----------- | --------------- |
| Fonte DC    | `dc-source.glb` |
| GND (massa) | `ground.glb`    |
| Resistência | `resistor.glb`  |
| Interruptor | `switch.glb`    |
| LED         | `led.glb`       |
| Díodo       | `diode.glb`     |
| Lâmpada     | `lamp.glb`      |

## 2. Medidas e posição (o mais importante)

**1 unidade do Blender (1 m) = 1 quadrado da grelha.**

```
 Vista de cima (Blender, eixo Z para cima)

         +Y (para cima no ecrã)
   terminal a    corpo     terminal b
       ●━━━━━━[██████]━━━━━━●        → +X
     x = -1                x = +1
         -Y (para baixo no ecrã)
```

| Regra                    | Dipolos (resistência, LED, fonte…)     | GND                              |
| ------------------------ | -------------------------------------- | -------------------------------- |
| Origem (ponto 0,0,0)     | centro do componente, **no chão**      | centro do símbolo, no chão       |
| Comprimento              | ao longo de **X**                      | —                                |
| Terminais                | **a em X = −1**, **b em X = +1** (Y=0) | terminal em **Y = +1** (em cima) |
| Caixa máxima (X × Y × Z) | 2 × 0,8 × 0,8                          | 1 × 1 × 0,5                      |
| Altura                   | nada abaixo de Z = 0                   | nada abaixo de Z = 0             |

- Ordem dos terminais = a do catálogo: fonte **+ em X = −1**, − em X = +1;
  LED e díodo **ânodo em X = −1**, cátodo em X = +1.
- As bolinhas dos terminais (e os fios) são desenhadas pela aplicação — **não modelar** fios.
  As patas do componente devem acabar nos pontos X = ±1.
- A etiqueta (R1, D1…) aparece por cima: não escrever o nome no modelo.

## 3. Materiais com nome especial

| Nome do material | O que a aplicação faz                                                              |
| ---------------- | ---------------------------------------------------------------------------------- |
| `luz`            | acende-se: LED/lâmpada a funcionar, componente selecionado; pisca em sobrecorrente |
| `corpo`          | recebe a cor do componente (ex.: a cor do LED escolhida no painel)                 |
| `corpo-luz`      | as duas coisas: recebe a cor e acende-se (ex.: a cúpula do LED)                    |
| outros nomes     | ficam com as cores do Blender (ex.: `metal`, `plastico`)                           |

- Usar só o shader **Principled BSDF** (é o que passa para o `.glb`).
- Cores simples (Base Color). Texturas só se forem pequenas (≤ 512 × 512 px).

## 4. Limites (o PC dos alunos tem de aguentar 50 componentes)

- **≤ 2 000 triângulos** por modelo (ver no Blender: Overlays → Statistics).
- **≤ 200 KB** por ficheiro `.glb`.
- Aplicar a escala e a rotação antes de exportar: `Ctrl+A → All Transforms`.

## 5. Exportar do Blender

`File → Export → glTF 2.0 (.glb)`, com:

- Format: **glTF Binary (.glb)**
- Include: **Selected Objects** (só o componente)
- Transform: **+Y Up** ✔ (o Blender converte Z-up para Y-up sozinho)
- Mesh: Apply Modifiers ✔ · Materials: Export
- Compression (Draco): **desligado** (a aplicação ainda não carrega Draco)

## 6. Pôr o modelo na aplicação

1. Copiar o `.glb` para esta pasta (`public/models/`), com o nome da tabela 1.
2. Em `src/scene/models3d.ts`, acrescentar a linha na lista `MODEL_FILES`, ex.:
   `resistor: 'resistor.glb',`
3. `pnpm dev` e verificar: o modelo está em cima do quadrado certo, as patas tocam nas bolinhas
   dos terminais, roda com a tecla **R**, o LED acende quando se simula.
4. Commit num ramo `feature/modelo-<tipo>` (o Git LFS trata do `.glb` sozinho, por causa do
   `.gitattributes`): `feat(models3d): adiciona modelo da resistência`.
