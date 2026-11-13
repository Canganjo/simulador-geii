import type { Messages } from './pt'

/** Textos da interface em FRANCÊS (mesmas chaves que pt.ts). */
export const fr: Messages = {
  'app.title': 'Simulateur 2.5D',
  'topbar.actions': 'Actions',
  'topbar.help': 'Aide',
  'action.new': 'Nouveau',
  'action.open': 'Ouvrir',
  'action.save': 'Enregistrer',
  'action.undo': 'Annuler',
  'action.redo': 'Rétablir',
  'action.simulate': 'Simuler',
  'action.stop': 'Arrêter',
  'action.reset': 'RAZ', // remise à zéro

  'menu.label': 'Menu des composants',
  'menu.title': 'Composants',
  'menu.collapse': 'Réduire le menu',
  'menu.expand': 'Ouvrir le menu',
  'menu.search': 'Rechercher…',
  'menu.itemHint': 'Glisse vers la zone libre (ou clique) pour ajouter : {name}',
  'menu.empty': 'Aucun composant trouvé.',

  'category.Fontes': 'Sources',
  'category.Passivos': 'Passifs',
  'category.Comando': 'Commande',
  'category.Semicondutores': 'Semi-conducteurs',
  'category.Cargas': 'Charges',

  'kind.dc-source': 'Source DC',
  'kind.ground': 'GND',
  'kind.resistor': 'Résistance',
  'kind.switch': 'Interrupteur',
  'kind.led': 'LED',
  'kind.lamp': 'Lampe',

  'param.voltage': 'Tension',
  'param.resistance': 'Résistance',
  'param.ratedPower': 'Puissance nominale',
  'param.closed': 'Fermé',
  'param.forwardVoltage': 'Tension de seuil (Vf)',
  'param.seriesResistance': 'Résistance série',
  'param.maxCurrent': 'Courant maximal',
  'param.color': 'Couleur',
  'param.ratedVoltage': 'Tension nominale',

  'color.vermelho': 'rouge',
  'color.verde': 'vert',
  'color.azul': 'bleu',
  'color.amarelo': 'jaune',
  'color.branco': 'blanc',

  'props.label': 'Propriétés',
  'props.collapse': 'Réduire les propriétés',
  'props.expand': 'Ouvrir les propriétés',
  'props.empty':
    'Sélectionne un composant pour voir et modifier le nom, la valeur, l’unité et la rotation.',
  'props.position': 'Position',
  'props.rotation': 'Rotation',
  'props.rotate': 'Tourner',
  'props.duplicate': 'Dupliquer',
  'props.delete': 'Supprimer',
  'props.name': 'Nom',
  'props.nameEmpty': 'Le nom ne peut pas être vide.',
  'props.nameTaken': 'Il existe déjà un composant nommé {name}.',
  'props.invalidNumber': 'Écris un nombre, ex. : 470, 4,7k, 4k7, 2m.',
  'props.outOfRange': 'Doit être compris entre {min} et {max}.',
  'props.numberHint':
    'Ex. : 470 · 4,7k · 4k7 · 2m (milli) · 1M (méga). Entrée applique, Échap annule.',
  'common.yes': 'Oui',
  'common.no': 'Non',

  'results.label': 'Résultats',
  'results.collapse': 'Réduire les résultats',
  'results.expand': 'Ouvrir les résultats',
  'results.hintBefore': 'Appuie sur',
  'results.hintAfter':
    'pour voir la tension (U), le courant (I), la résistance (R) et la puissance (P) de chaque composant.',

  'results.component': 'Composant',
  'results.ledOn': 'allumée',
  'results.ledOff': 'éteinte',
  'results.error': 'Erreur',
  'results.warning': 'Avertissement',
  'results.calcFailed': 'Le calcul a échoué : {detail}',

  'terminal.anodo': 'anode',
  'terminal.catodo': 'cathode',

  'issue.no-source': 'Il n’y a aucune source de tension dans le circuit.',
  'issue.no-ground': 'Il manque la masse GND (référence 0 V). Relie un GND au circuit.',
  'issue.invalid-wire': 'Le fil {wire} est relié à une borne qui n’existe pas.',
  'issue.invalid-params': '{name} : la valeur de « {param} » n’est pas valide.',
  'issue.source-short-wire': '{name} est en court-circuit : le + et le − sont reliés par un fil.',
  'issue.source-short-switch':
    '{name} est en court-circuit : le + et le − sont reliés par un interrupteur fermé.',
  'issue.parallel-sources':
    '{a} et {b} sont en parallèle (deux sources reliées aux deux mêmes nœuds).',
  'issue.floating-part': '{name} n’est pas relié au reste du circuit avec la masse.',
  'issue.open-circuit': 'Circuit ouvert : aucun courant ne sort de {name}.',
  'issue.loose-terminal': '{name} : la borne {terminal} n’est pas reliée.',
  'issue.led-overcurrent':
    '{name} : courant de {current} au-dessus du courant maximal ({max}) — la LED grillerait.',

  'resize.menu': 'Redimensionner le menu',
  'resize.results': 'Redimensionner les résultats',
  'resize.properties': 'Redimensionner les propriétés',
  'resize.hint': 'double clic : taille par défaut',
  'drawer.close': 'Fermer le panneau',

  'workspace.label': 'Zone libre',
  'workspace.wiringBefore': 'Liaison de',
  'workspace.wiringAfter': '— clique sur une autre borne (Échap pour annuler)',

  'account.label': 'Compte : {name}',
  'account.menu': 'Menu du compte',
  'account.name': 'Nom',
  'account.save': 'Enregistrer',
  'account.rename': 'Changer le nom',
  'account.renameHint': 'Clique pour changer le nom',
  'account.password': 'Changer mon mot de passe',
  'account.language': 'Langue',
  'account.appearance': 'Apparence',
  'account.about': 'À propos du simulateur',
  'account.logout': 'Se déconnecter',
}
