# Registo de decisões

Cada decisão importante (arquitetura, stack, formatos) fica aqui, da mais recente para a mais antiga.
Formato: **data · decisão · porquê · alternativas consideradas · estado**.

Estados: ✅ decidido · 🟡 a validar em reunião · ❌ abandonado.

---

## D-014 · 2026-11-16 · Etiquetas móveis e interruptor com clique na cena ✅

- **Etiquetas:** cada componente pode ter `labelOffset` (opcional, em quadrados da grelha) no
  ficheiro `.geii.json`. É só aspeto: o motor de cálculo ignora-o. Ficheiros antigos abrem sem ele
  (etiqueta no sítio normal) e o formato continua na versão 1.
  - Só a etiqueta do componente **selecionado** se agarra; as outras deixam passar o clique, para
    nunca taparem um terminal na hora de ligar fios. Duplo clique repõe o sítio normal.
  - A etiqueta do GND fica ao lado do símbolo (por cima tapava o terminal).
- **Interruptor:** um clique sem arrastar abre/fecha (`toggleSwitch`); há dois modelos 3D
  (`switch.glb` fechado, `switch-open.glb` aberto).
- **Alternativas:** guardar a etiqueta em posição absoluta (perdia-se ao mover o componente);
  abrir/fechar só no painel (o utilizador pediu clique na cena, como no Tinkercad).

## D-013 · 2026-11-16 · Fonte DC de bancada: botões + / −, limite de corrente (CV/CC) e recálculo automático ✅

Pedido da maquete (prioridade 1): a fonte DC tem de se comportar como a fonte do laboratório.

- **Limite de corrente** (`currentLimit`, **3 A por omissão**, de 1 mA a 100 A):
  - **CV** (tensão constante): a fonte dá a tensão regulada enquanto a carga pedir I ≤ Imax;
  - **CC** (corrente constante): se a carga pedir mais, a fonte dá **I = Imax** e a tensão **cai**
    (U = R · Imax). Ex.: 12 V, Imax = 100 mA, 47 Ω → I = 100 mA, U = 4,7 V (não 255 mA).
  - No motor: o mesmo ciclo "supor e verificar" dos LED. Em CC a fonte entra na netlist como
    **fonte de corrente Imax**; volta a CV se a tensão passar a regulada. Aviso `source-current-limit`.
  - Sem `currentLimit` (só no core/testes) a fonte é ideal. **Ficheiros antigos** abrem com 3 A
    (os parâmetros em falta vêm do catálogo).
  - **Transitório:** a fonte fica ideal (CV); só há um aviso se o pico de corrente passar Imax.
- **Botões − / +** junto ao campo Tensão e em cima da fonte selecionada (na cena): 0,1 V por clique,
  Shift = 1 V, manter carregado repete; tudo o que muda enquanto se carrega é **um só passo do
  desfazer**. Potência máxima U × Imax mostrada como informação (não é um parâmetro).
- **Recálculo automático:** depois de Simular (ou Transitório), mudar só **valores** (tensão,
  resistência, nome…) volta a calcular logo com a mesma análise; **mover** não mexe nos números
  (o circuito elétrico é o mesmo); mudar **ligações** (fios, juntar/apagar componentes) limpa, como antes.
- **Visor da fonte:** antes de Simular mostra a tensão regulada; depois, a tensão de saída medida e
  o modo (**CV** a verde, **CC** a âmbar). A tabela de resultados e o painel mostram o mesmo modo.
- **Alternativas:** fonte sempre ideal (não ensina a limitação de corrente do laboratório);
  limite de potência em vez de corrente (as fontes do laboratório limitam a corrente).

## D-012 · 2026-11-16 · Condensador e bobina na interface: DC e modo Transitório ✅

E10-4: os componentes `capacitor` (C1, C2…) e `inductor` (L1, L2…) entram no menu (Passivos).

- **Botão Simular (DC, regime permanente):**
  - condensador = **circuito aberto** (fica fora da netlist, como um interruptor aberto): I = 0 e a
    tensão aos terminais é a do circuito;
  - bobina = **fio** (resistência de 1 mΩ, como o interruptor fechado). Uma bobina diretamente entre o
    + e o − de uma fonte é um **curto-circuito** (erro, como um fio).
- **Botão Transitório:** janela com duração e passo (por defeito 0,5 s e 1 ms). Usa o motor da D-010.
  O painel mostra os valores no **instante final**; as curvas ficam guardadas para o gráfico (E10-5).
- **LED simples fora do transitório:** o modelo "conduz/bloqueado" (supor e verificar) não tem
  sentido passo a passo; no transitório pede-se o **díodo real** (D-009). Erro claro se houver um LED.
- **Prefixo L partilhado** pela lâmpada e pela bobina (como o D do LED e do díodo): os nomes
  continuam únicos (L1, L2…). Substitui a ideia antiga de mudar a lâmpada para `LP`.
- **Porquê:** reutiliza a validação, a netlist e o painel do DC; o regime permanente coincide com o
  fim de um transitório longo (verificado nos testes).

## D-010 · 2026-11-16 · Transitório: Euler implícito com passo fixo ✅

Fase 4 do motor (E10): condensador e bobina ao longo do tempo.

- **Método:** **Euler implícito** (backward Euler) com **passo fixo h** escolhido pelo utilizador.
  - **Condensador:** resistência h/C em paralelo com uma fonte de corrente −(C/h)·uₙ.
  - **Bobina:** resistência L/h em paralelo com uma fonte de corrente iₙ.
  - Cada passo é um circuito DC normal, resolvido pelo MNA ou pelo Newton-Raphson (D-009) se houver
    díodos.
- **Estado inicial:** condensadores com `initialVoltage` (0 V por defeito) e bobinas com
  `initialCurrent` (0 A).
  - O ponto t = 0 é calculado com o condensador como **fonte de tensão** e a bobina como **fonte de
    corrente** (exato).
  - Se isso não tiver solução (condensador diretamente numa fonte de tensão), usam-se resistências de
    1 mΩ / 1 GΩ.
- **Limite:** no máximo **100 000 passos** por simulação (erro claro acima disso).
- **Porquê:** é o método mais simples que é **sempre estável**, para qualquer passo. Os resultados de
  cada passo seguem uma fórmula calculável à mão, xₖ = X∞ · (1 − (1 + h/τ)^(−k)), por isso os testes
  são exatos. Reutiliza todo o MNA e o Newton já testados.
- **Limitação conhecida:** é de 1.ª ordem: o erro é proporcional a h (com h = τ/1000, < 0,05 %).
- **Alternativas consideradas:**
  - trapézios (método do SPICE) — 2.ª ordem, mais exato, mas pode oscilar ("ringing") e é mais difícil
    de explicar;
  - Euler explícito — instável se h for grande;
  - passo variável — mais rápido, mas mais complexo; fica para depois, se for preciso.

## D-009 · 2026-11-15 · Díodo real: modelo de Shockley resolvido por Newton-Raphson ✅

Início da E10 (fase 3 do motor, ver `docs/plano-simulador-geii.md`).

- **Modelo:** equação de Shockley `I = Is · (e^(U/(n·Vt)) − 1)`, sem resistência série nem rutura
  inversa (ficam para depois, se forem precisas).
  - **Vt = k·T/q a 300 K = 25,852 mV** (temperatura fixa).
  - **Valores por defeito do 1N4148** (modelos SPICE habituais): **Is = 2,52 nA, n = 1,752** → cerca de
    0,65 V a 4 mA.
- **Método (como o SPICE):** em cada iteração o díodo é trocado pela sua **reta tangente**, uma
  resistência 1/g em paralelo com uma fonte de corrente Ieq; resolve-se o MNA linear e repete-se.
  - **paragem:** a tensão de todos os díodos muda menos de **1 µV**; máximo **100 iterações**
    (senão: erro `no-convergence` com mensagem clara);
  - **limitação do salto de tensão** (`pnjlim` do SPICE), para a exponencial nunca dar infinito;
  - **GMIN = 10⁻¹² S** em paralelo com cada díodo, para a matriz não ficar singular com o díodo bloqueado.
- **O MNA ganha a fonte de corrente** (elemento `current-source`), necessária para a reta tangente.
- **O LED mantém o modelo simples** (Vf + Rs) do MVP: os testes de referência da planilha e o que os
  estudantes já conhecem não mudam. O díodo real é um componente novo (`diode`).
- **Porquê:** é o método do SPICE/LTspice (permite comparar resultados) e reutiliza todo o MNA que já
  está testado; Newton converge em poucas iterações (quadrático) perto da solução.
- **Alternativas consideradas:**
  - modelo por troços (Vf + Rs, como o LED) — simples, mas não mostra a curva exponencial real;
  - bisseção / ponto fixo — mais simples de explicar, mas lentos e só funcionam com um díodo de cada vez;
  - biblioteca externa de cálculo — contra a decisão de ter um motor próprio (D-005).

## D-008 · 2026-11-09 · Formatos de ficheiro, exportações e distribuição 🟡 (a validar em reunião)

Detalha e alarga a D-004.

- **Projeto guardado em JSON**, com a extensão **`.geii.json`** (ex.: `divisor-12V.geii.json`):
  - campo **`version`** no topo (hoje `1`), para conseguir abrir ficheiros antigos depois de o formato
    mudar (migração);
  - **validado com Zod** ao abrir: um ficheiro estragado ou de outra versão dá uma mensagem clara, em vez
    de "partir" a aplicação.
- **Guarda só o circuito, não os resultados:**
  - componentes (tipo, nome, valores elétricos, posição, rotação) e fios **pelos IDs dos terminais**
    (`"c3:+"`), nunca por posições;
  - os resultados (U, I, P) **não se guardam**: recalculam-se ao carregar em Simular.
- **Exportações futuras, por prioridade:**
  1. **netlist SPICE `.cir`** — abrir o mesmo circuito no LTspice e comparar os resultados com o nosso
     solver (verificação independente);
  2. **CSV dos resultados** — tabela U, I, R, P por componente, para o Excel ou um relatório;
  3. **PNG / SVG do esquema** — imagem para relatórios e apresentações;
  4. **PDF** — relatório completo (esquema + resultados).
- **Distribuição:**
  - **agora:** aplicação **web** em GitHub Pages (um link, nada a instalar);
  - **mais tarde (opcional):** programa **`.exe`** para Windows com **Tauri**, a partir do mesmo código.
- **Porquê:**
  - `.geii.json` é texto: abre-se em qualquer editor, vê-se bem num diff do Git e a extensão dupla diz
    logo que é um projeto deste simulador (sem deixar de ser JSON);
  - não guardar resultados evita ficheiros com números desatualizados (alguém muda uma resistência e o
    resultado guardado já não corresponde ao circuito);
  - o `.cir` primeiro porque serve para **validar o motor de cálculo** contra uma referência da indústria;
  - Tauri gera um instalador pequeno (alguns MB) porque usa o browser do sistema.
- **Alternativas consideradas:**
  - formato binário próprio — mais pequeno, mas ilegível e difícil de depurar;
  - guardar também os resultados — rápido a reabrir, mas arrisca resultados errados;
  - `.json` simples — funciona, mas não se distingue de outros ficheiros JSON;
  - Electron em vez de Tauri — mais conhecido, mas instaladores de ~100 MB.

## D-007 · 2026-11-09 · TypeScript fixado em 6.0 (não 7.0) ✅

- **Decisão:** usar `typescript ~6.0` em vez do 7.0 que o modelo do Vite instala.
- **Porquê:** o `typescript-eslint` (necessário para o ESLint ler TypeScript) só suporta até 6.0. O
  TypeScript 7 (versão nativa, mais rápida) ainda não é compatível. A linguagem e o modo strict são iguais.
- **Revisitar:** quando o `typescript-eslint` suportar o TypeScript 7.

## D-006 · 2026-11-09 · Câmara ortográfica estrita no MVP 🟡 (proposta, confirmar em reunião)

- **Decisão:** câmara ortográfica vista de cima, ligeiramente inclinada para se ver o volume dos
  componentes; sem perspetiva no MVP.
- **Porquê:** grelha e snap ficam exatos, os fios ortogonais ficam legíveis.
- **Alternativa:** ligeira perspetiva (dossier, secção 22) — pode ser uma opção mais tarde.

## D-005 · 2026-11-09 · Análise nodal modificada (MNA) como base do solver ✅

- **Decisão:** um único método — MNA com eliminação de Gauss e pivotagem parcial — para todos os
  circuitos DC lineares (série, paralelo, misto, várias fontes).
- **Porquê:** é a base do SPICE/LTspice; trata tudo de uma vez; estende-se a díodos (Newton-Raphson),
  transitórios (Euler implícito) e AC (números complexos).
- **Alternativa:** regras de série/paralelo — não funcionam para circuitos mistos com várias fontes.
- **Solver escrito à mão** (sem biblioteca): o grupo tem de saber explicá-lo. Python/NumPy só para
  verificar resultados.

## D-004 · 2026-11-09 · Formato de gravação: JSON com versão + Zod ✅

- **Decisão:** projetos guardados em `.json` com campo `version`; validados com Zod ao abrir.
- **Porquê:** legível, fácil de testar, e o campo `version` permite migrar ficheiros antigos.
- **Detalhado e alargado em D-008** (extensão `.geii.json`, o que se guarda, exportações, distribuição).

## D-003 · 2026-11-09 · O núcleo (`src/core`) não depende da interface ✅

- **Decisão:** `src/core` é TypeScript puro; não importa React, Three.js, Zustand nem `ui/scene/store`.
  Verificado por uma regra ESLint (`no-restricted-imports`).
- **Porquê:** o motor testa-se sozinho com Vitest; pode ser reutilizado (desktop, VR, outra linguagem).

## D-002 · 2026-11-09 · Stack web: TypeScript + React + Three.js (R3F) em vez de Unity ✅

- **Decisão:** aplicação web (Vite + React + React Three Fiber), publicada em GitHub Pages.
- **Porquê:** partilhar = enviar um link; o editor (menus, painéis) é muito mais fácil em React; quase
  tudo é código, por isso a IA (Claude Code) ajuda muito mais; ferramentas leves.
- **Alternativas:** Unity (melhor para VR, mas pesado e muito trabalho manual no editor), Tauri
  (opcional mais tarde para versão desktop com o mesmo código).
- **Nota:** o dossier técnico ainda refere Unity (Canvas, prefabs) — essas partes foram substituídas por
  esta decisão.

## D-001 · 2026-11-09 · Gestor de pacotes: pnpm ✅

- **Decisão:** pnpm (não npm/yarn). **Porquê:** mais rápido, ocupa menos disco, lockfile fiável.

---

## Decisões ainda a validar em reunião (dossier, secção 22) 🟡

| Tema                                   | Proposta atual                                 |
| -------------------------------------- | ---------------------------------------------- |
| Nome final da aplicação                | "Simulador 2.5D de Circuitos GEII" (provisório)|
| Posição exata do menu de componentes   | Esquerda, recolhível                            |
| Lista final do MVP                     | Fonte DC, GND, R, interruptor, LED, lâmpada     |
| Fios ortogonais ou curvos              | Ortogonais                                      |
| Convenções de nomes                    | V1…, GND1…, R1…, S1… (interr.), D1… (LED), L1… (lâmpada) |
| Formato de gravação e exportações      | Ver D-008 (`.geii.json`, sem resultados, `.cir` primeiro) |
| Distribuição de funções e calendário   | Pessoa 1/2/3 conforme README; plano de 14 sem. |

Nota sobre os nomes: no SPICE, `L` é a letra das bobinas. Decidido em D-012: a lâmpada e a bobina
partilham o prefixo `L` (os nomes continuam únicos).
