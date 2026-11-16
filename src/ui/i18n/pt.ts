/**
 * Textos da interface em PORTUGUÊS — a língua de referência.
 *
 * As outras línguas (fr.ts, en.ts) têm o tipo `Messages`: o TypeScript dá erro se lhes faltar
 * uma chave ou se tiverem uma a mais. Para acrescentar um texto: pô-lo aqui E nas outras duas.
 *
 * `{nome}` dentro de um texto é substituído por um valor (ver `translate`).
 */
export const pt = {
  // Barra superior
  'app.title': 'Simulador 2.5D',
  'topbar.actions': 'Ações',
  'topbar.help': 'Ajuda',
  'action.new': 'Novo',
  'action.open': 'Abrir',
  'action.save': 'Guardar',
  'action.saveAs': 'Guardar como…',
  'action.undo': 'Desfazer',
  'action.redo': 'Refazer',
  'action.simulate': 'Simular',
  'action.stop': 'Parar',
  'action.transient': 'Transitório',
  'transient.title': 'Simulação no tempo (transitório)',
  'transient.hint':
    'Condensadores e bobinas evoluem de t = 0 até ao fim (Euler implícito, passo fixo).',
  'transient.duration': 'Duração',
  'transient.step': 'Passo',
  'transient.run': 'Simular no tempo',
  'transient.cancel': 'Cancelar',
  'transient.invalid': 'Escreve um tempo maior que 0, ex.: 0,5 s ou 1 ms.',
  'transient.tooMany':
    '{steps} passos é demais (máximo {max}). Aumenta o passo ou reduz a duração.',
  'results.transientInfo':
    'Transitório de 0 a {duration} ({steps} passos): valores no instante final.',
  'chart.component': 'Componente',
  'chart.voltage': 'Tensão u(t)',
  'chart.current': 'Corrente i(t)',
  'chart.tau': 'τ ≈ {tau} (63 %)',
  'action.reset': 'Reset',
  'action.nodes': 'Nós',
  'action.nodesHint': 'Mostrar o número do nó de cada terminal (debug)',

  // Ficheiros de projeto (Novo, Abrir, Guardar)
  'file.confirmDiscard': 'Há alterações por guardar que se vão perder. Queres mesmo continuar?',
  'file.unsaved': 'Alterações por guardar',
  'file.errorNotJson': 'Não foi possível abrir {file}: não é um ficheiro de projeto (.geii.json).',
  'file.errorNewer':
    'Não foi possível abrir {file}: foi feito por uma versão mais recente do simulador (formato {version}).',
  'file.errorInvalid': 'Não foi possível abrir {file}: o projeto tem um problema ({detail}).',
  'file.close': 'Fechar',

  // Menu de componentes
  'menu.label': 'Menu de componentes',
  'menu.title': 'Componentes',
  'menu.collapse': 'Recolher menu',
  'menu.expand': 'Abrir menu',
  'menu.search': 'Pesquisar…',
  'menu.itemHint': 'Arrasta para a zona livre (ou clica) para adicionar: {name}',
  'menu.empty': 'Nenhum componente encontrado.',
  'menu.summary.ground': 'referência 0 V',
  'menu.summary.switch': 'aberto',
  'menu.summary.diode': 'Si · 1N4148',

  // Categorias (o nome técnico vem do catálogo, em src/core/library)
  'category.Fontes': 'Fontes',
  'category.Passivos': 'Passivos',
  'category.Comando': 'Comando',
  'category.Semicondutores': 'Semicondutores',
  'category.Cargas': 'Cargas',

  // Componentes (pelo tipo: ComponentKind)
  'kind.dc-source': 'Fonte DC',
  'kind.ground': 'GND',
  'kind.resistor': 'Resistência',
  'kind.switch': 'Interruptor',
  'kind.led': 'LED',
  'kind.lamp': 'Lâmpada',
  'kind.diode': 'Díodo',
  'kind.capacitor': 'Condensador',
  'kind.inductor': 'Bobina',

  // Parâmetros (pelo nome técnico no catálogo)
  'param.voltage': 'Tensão',
  'param.resistance': 'Resistência',
  'param.ratedPower': 'Potência nominal',
  'param.closed': 'Fechado',
  'param.forwardVoltage': 'Tensão de limiar (Vf)',
  'param.seriesResistance': 'Resistência série',
  'param.maxCurrent': 'Corrente máxima',
  'param.color': 'Cor',
  'param.ratedVoltage': 'Tensão nominal',
  'param.saturationCurrent': 'Corrente de saturação (Is)',
  'param.emissionCoefficient': 'Coeficiente de emissão (n)',
  'param.capacitance': 'Capacidade',
  'param.initialVoltage': 'Tensão inicial',
  'param.inductance': 'Indutância',
  'param.initialCurrent': 'Corrente inicial',
  'param.currentLimit': 'Limite de corrente (Imax)',
  'source.increase': 'Aumentar a tensão (+0,1 V · Shift: +1 V · manter carregado repete)',
  'source.decrease': 'Diminuir a tensão (−0,1 V · Shift: −1 V · manter carregado repete)',
  'source.maxPower': 'Potência máxima (U × Imax): {power}',
  'source.modeHint': 'CV = tensão constante · CC = corrente limitada a Imax (a tensão cai).',

  // Cores do LED (o valor guardado no projeto fica sempre em português)
  'color.vermelho': 'vermelho',
  'color.verde': 'verde',
  'color.azul': 'azul',
  'color.amarelo': 'amarelo',
  'color.branco': 'branco',

  // Painel de propriedades
  'props.label': 'Propriedades',
  'props.collapse': 'Recolher propriedades',
  'props.expand': 'Abrir propriedades',
  'props.multiTitle': '{count} componentes selecionados',
  'props.multiHint':
    'Delete apaga todos de uma vez (Ctrl+Z repõe). Ctrl+clique junta ou tira um componente.',
  'props.deleteAll': 'Apagar os {count}',
  'props.empty':
    'Seleciona um componente para ver e editar o nome, o valor, a unidade e a rotação.',
  'props.position': 'Posição',
  'props.rotation': 'Rotação',
  'props.rotate': 'Rodar',
  'props.duplicate': 'Duplicar',
  'props.wireTitle': 'Fio',
  'props.wireHint':
    'Arraste um troço do fio para o deslocar (para cima/baixo ou para os lados) e organizar o circuito. Duplo clique no fio endireita-o.',
  'props.straighten': 'Endireitar fio',
  'props.deleteWire': 'Apagar fio',
  'props.delete': 'Apagar',
  'props.name': 'Nome',
  'props.nameEmpty': 'O nome não pode ficar vazio.',
  'props.nameTaken': 'Já existe um componente chamado {name}.',
  'props.invalidNumber': 'Escreve um número, ex.: 470, 4,7k, 4k7, 2m.',
  'props.outOfRange': 'Tem de estar entre {min} e {max}.',
  'props.numberHint': 'Ex.: 470 · 4,7k · 4k7 · 2m (mili) · 1M (mega). Enter aplica, Esc anula.',
  'common.yes': 'Sim',
  'common.no': 'Não',

  // Painel de resultados ("Carrega em [Simular] para ver…")
  'results.label': 'Resultados',
  'results.collapse': 'Recolher resultados',
  'results.expand': 'Abrir resultados',
  'results.hintBefore': 'Carrega em',
  'results.hintAfter':
    'para ver a tensão (U), a corrente (I), a resistência (R) e a potência (P) de cada componente.',

  // Resultados da simulação
  'results.component': 'Componente',
  'results.ledOn': 'aceso',
  'results.ledOff': 'apagado',
  'results.diodeOn': 'conduz',
  'results.sourceCv': 'CV',
  'results.sourceCc': 'CC',
  'results.sourceCvTitle': 'Tensão constante (abaixo do limite de corrente)',
  'results.sourceCcTitle': 'Corrente limitada a Imax (a tensão caiu)',
  'results.diodeOff': 'bloqueado',
  'results.error': 'Erro',
  'results.warning': 'Aviso',
  'results.calcFailed': 'O cálculo falhou: {detail}',

  // Terminais com nome (os outros, como "a" e "b", mostram-se tal como estão)
  'terminal.anodo': 'ânodo',
  'terminal.catodo': 'cátodo',

  // Mensagens do motor (pelo código do erro/aviso; {name} = nome do componente, ex.: R1)
  'issue.no-source': 'Não há nenhuma fonte de tensão no circuito.',
  'issue.no-ground': 'Falta o GND (referência 0 V). Liga um GND ao circuito.',
  'issue.invalid-wire': 'O fio {wire} liga a um terminal que não existe.',
  'issue.invalid-params': '{name}: o valor de «{param}» não é válido.',
  'issue.source-short-wire': '{name} está em curto-circuito: o + e o − estão ligados por um fio.',
  'issue.source-short-switch':
    '{name} está em curto-circuito: o + e o − estão ligados por um interruptor fechado.',
  'issue.source-short-inductor':
    '{name} está em curto-circuito: em DC uma bobina é um fio entre o + e o −.',
  'issue.led-in-transient':
    '{name}: o LED simples não entra no transitório. Usa um díodo (menu Semicondutores).',
  'issue.parallel-sources':
    '{a} e {b} estão em paralelo (duas fontes ligadas aos mesmos dois nós).',
  'issue.floating-part': '{name} não está ligado ao resto do circuito com GND.',
  'issue.open-circuit': 'Circuito aberto: nenhuma corrente sai de {name}.',
  'issue.loose-terminal': '{name}: o terminal {terminal} não está ligado.',
  'issue.led-overcurrent':
    '{name}: corrente de {current} acima da corrente máxima ({max}) — o LED queimava.',
  'issue.source-current-limit':
    '{name}: limite de corrente atingido (CC) — a fonte dá só {limit} e a tensão cai para {voltage}.',
  'issue.source-limit-transient':
    '{name}: no transitório a fonte não limita a corrente — pico de {current} acima do limite ({max}).',

  // Bordas dos painéis e gavetas (telemóvel)
  'resize.menu': 'Redimensionar menu',
  'resize.results': 'Redimensionar resultados',
  'resize.properties': 'Redimensionar propriedades',
  'resize.hint': 'duplo clique: tamanho por defeito',
  'drawer.close': 'Fechar painel',

  // Zona livre ("A ligar [R1:a] — clica…")
  'workspace.label': 'Zona livre',
  'workspace.wiringBefore': 'A ligar',
  'workspace.wiringAfter': '— clica noutro terminal (Esc para cancelar)',

  // Menu da conta
  'account.label': 'Conta: {name}',
  'account.menu': 'Menu da conta',
  'account.name': 'Nome',
  'account.save': 'Guardar',
  'account.rename': 'Mudar o nome',
  'account.renameHint': 'Clica para mudar o nome',
  'account.password': 'Alterar a minha password',
  'account.language': 'Idioma',
  'account.appearance': 'Aparência',
  'account.about': 'Sobre o Simulador',
  'account.logout': 'Terminar sessão',
} as const

export type MessageKey = keyof typeof pt
/** Um dicionário completo: exatamente as mesmas chaves que o português. */
export type Messages = Record<MessageKey, string>
