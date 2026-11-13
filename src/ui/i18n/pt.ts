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
  'action.undo': 'Desfazer',
  'action.redo': 'Refazer',
  'action.simulate': 'Simular',
  'action.stop': 'Parar',
  'action.reset': 'Reset',

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
  'props.empty':
    'Seleciona um componente para ver e editar o nome, o valor, a unidade e a rotação.',
  'props.position': 'Posição',
  'props.rotation': 'Rotação',
  'props.rotate': 'Rodar',
  'props.duplicate': 'Duplicar',
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
  'issue.parallel-sources':
    '{a} e {b} estão em paralelo (duas fontes ligadas aos mesmos dois nós).',
  'issue.floating-part': '{name} não está ligado ao resto do circuito com GND.',
  'issue.open-circuit': 'Circuito aberto: nenhuma corrente sai de {name}.',
  'issue.loose-terminal': '{name}: o terminal {terminal} não está ligado.',
  'issue.led-overcurrent':
    '{name}: corrente de {current} acima da corrente máxima ({max}) — o LED queimava.',

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
