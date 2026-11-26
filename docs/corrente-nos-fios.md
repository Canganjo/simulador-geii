# Corrente nos fios (cargas animadas)

Secção para o dossier técnico. Funcionalidade da E10, ramo `feature/corrente-fios`.

## O que o estudante vê

Depois de clicar em **Simular** (ou **Transitório**), o botão **Mostrar corrente** põe pequenas
cargas a andar ao longo dos fios:

- o sentido das cargas é o da corrente: do + para o − (sentido convencional, cargas amarelas) ou,
  se o estudante escolher, o dos eletrões (cargas azuis, ao contrário);
- quanto maior a corrente, mais depressa andam; sem corrente (abaixo de 1 µA) desaparecem;
- a cor do fio segue a corrente: cinzento sem corrente, depois de amarelo a vermelho;
- acima de 1 A o fio pisca a vermelho (corrente de curto-circuito numa bancada de estudante);
- com o rato por cima de um fio aparece o valor e o sentido, por exemplo `I = 12 mA V1:+ → R1:a`;
- no transitório, as cargas seguem a corrente de cada instante e um relógio mostra `t = …`
  (a simulação inteira passa em 6 s e recomeça).

Só há duas opções: o sentido e a velocidade da animação. A app fica simples de propósito.

## De onde vem a corrente de cada fio

O motor MNA dá a corrente de cada **componente**, não a de cada fio: para ele, os terminais ligados
por fios formam um só nó. A corrente de cada fio é deduzida em `src/core/wires/wireCurrents.ts`:

1. cada componente injeta corrente nos fios por um terminal e retira-a pelo outro (uma resistência
   com 4 mA de a para b retira 4 mA do fio em a e injeta 4 mA no fio em b);
2. os fios de um nó formam um pequeno grafo; quando é uma árvore, a lei dos nós (KCL) em cada
   terminal dá a corrente de cada fio;
3. quando há fios a mais (uma malha só de fios), a KCL não chega; a corrente divide-se então como
   num fio real, com uma resistência proporcional ao comprimento de cada fio;
4. os símbolos GND ligam todos a uma "terra" comum, que não se desenha.

Testes com o cálculo à mão em comentário (`wireCurrents.test.ts`): circuito série, paralelo, ponte
de Wheatstone desequilibrada (I(R5) = 10/7 mA), malha só de fios, dois GND e interruptor aberto.

## A velocidade das cargas e a física real

Num fio há três velocidades diferentes [1], [2]:

| O quê                                              | Ordem de grandeza   |
| -------------------------------------------------- | ------------------- |
| agitação térmica de cada eletrão (aleatória)       | ~1000 km/s          |
| deriva dos eletrões (o movimento médio = corrente) | frações de mm/s     |
| propagação do sinal elétrico ao longo do fio       | ~200 000 km/s       |

A velocidade de deriva é v = I / (n · e · A), com n ≈ 8,5 × 10²⁸ eletrões livres por m³ no cobre,
e = 1,6 × 10⁻¹⁹ C e A a secção do fio [1]. Exemplos:

- 10 A num cabo de 2,5 mm²: v ≈ 0,29 mm/s;
- 1000 A num cabo de 240 mm²: v ≈ 0,31 mm/s (quase o mesmo: o cabo é grosso para isso);
- 12 mA num fio de bancada de 0,2 mm²: v ≈ 0,004 mm/s.

A tensão e a potência não entram na fórmula. A tensão é a energia por unidade de carga; só muda a
velocidade através da corrente que provoca. A lâmpada acende logo porque o sinal (o campo elétrico)
chega quase à velocidade da luz e põe todos os eletrões do fio a andar ao mesmo tempo.

À escala real as cargas pareceriam paradas. A animação é por isso uma escala pedagógica, como a
de um mapa: a velocidade cresce com o logaritmo de |I|, de 0,4 células/s (1 µA) até 4 células/s
(10 A ou mais). Cada década de corrente (×10) soma o mesmo à velocidade, por isso 1 mA e 10 A
veem-se os dois a mexer no mesmo circuito. A velocidade não representa a velocidade real dos
eletrões; o que é real é o sentido, a comparação entre fios e o valor mostrado ao passar o rato.

Um fio ideal (0 Ω) não tem tensão entre as pontas (U = R · I = 0), mas tem corrente e está a um
potencial em relação ao GND. Um díodo a conduzir tem as duas coisas: cerca de 0,6 a 0,7 V aos
terminais (silício) e a corrente do circuito.

## Desempenho

Todas as cargas de todos os fios são um só `InstancedMesh` (uma chamada de desenho). A cada imagem
só se mudam as posições, em vetores criados uma vez, sem re-render do React. Medição com 201 fios
(100 resistências em paralelo): 60 imagens por segundo com placa gráfica, como sem a animação.

## Ficheiros

| Ficheiro                         | Papel                                                     |
| -------------------------------- | --------------------------------------------------------- |
| `src/core/wires/wireCurrents.ts` | correntes dos componentes → corrente em cada fio (KCL)    |
| `src/core/wires/chargeMotion.ts` | corrente → velocidade, cor, curto-circuito                |
| `src/scene/ChargeFlow.tsx`       | as cargas na cena (InstancedMesh, `useFrame`)             |
| `src/scene/chargePath.ts`        | posição de uma carga ao longo do traçado do fio           |
| `src/scene/WireView.tsx`         | cor do fio e piscar                                       |
| `src/ui/CurrentControls.tsx`     | painel: sentido e velocidade da animação                  |
| `tests/e2e/corrente-fios.spec.ts`| teste da interface (valor, sentido, transitório)          |

## Bibliografia

Referências escritas segundo o *Guide de rédaction des références bibliographiques* das bibliotecas
da Universidade de Orléans (adaptado da norma AFNOR Z 44-005, equivalente francês da ISO 690).

[1] HALLIDAY, David, RESNICK, Robert et WALKER, Jearl. *Fundamentals of Physics*. 10th ed.
Hoboken : Wiley, 2014. Chap. 26, Current and Resistance.

[2] SERWAY, Raymond A. et JEWETT, John W. *Physics for Scientists and Engineers*. 9th ed.
Boston : Brooks/Cole, 2014. Chap. 27, Current and Resistance.
