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
  'common.yes': 'Sim',
  'common.no': 'Não',

  // Painel de resultados ("Carrega em [Simular] para ver…")
  'results.label': 'Resultados',
  'results.collapse': 'Recolher resultados',
  'results.expand': 'Abrir resultados',
  'results.hintBefore': 'Carrega em',
  'results.hintAfter':
    'para ver a tensão (U), a corrente (I), a resistência (R) e a potência (P) de cada componente.',

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
