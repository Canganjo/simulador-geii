import type { Messages } from './pt'

/** Textos da interface em FRANCÊS (mesmas chaves que pt.ts). */
export const fr: Messages = {
  'app.title': 'Simulateur 2.5D',
  'topbar.actions': 'Actions',
  'topbar.help': 'Aide',
  'action.new': 'Nouveau',
  'action.open': 'Ouvrir',
  'action.save': 'Enregistrer',
  'action.saveAs': 'Enregistrer sous…',
  'action.undo': 'Annuler',
  'action.redo': 'Rétablir',
  'action.simulate': 'Simuler',
  'action.stop': 'Arrêter',
  'action.transient': 'Transitoire',
  'transient.title': 'Simulation temporelle (transitoire)',
  'transient.hint':
    'Condensateurs et bobines évoluent de t = 0 jusqu’à la fin (Euler implicite, pas fixe).',
  'transient.duration': 'Durée',
  'transient.step': 'Pas',
  'transient.run': 'Simuler dans le temps',
  'transient.cancel': 'Annuler',
  'transient.invalid': 'Entrez un temps supérieur à 0, ex. : 0,5 s ou 1 ms.',
  'transient.tooMany':
    '{steps} pas, c’est trop (maximum {max}). Augmentez le pas ou réduisez la durée.',
  'results.transientInfo':
    'Transitoire de 0 à {duration} ({steps} pas) : valeurs à l’instant final.',
  'action.reset': 'RAZ', // remise à zéro
  'action.nodes': 'Nœuds',
  'action.nodesHint': 'Afficher le numéro du nœud de chaque borne (débogage)',

  'file.confirmDiscard':
    'Des modifications non enregistrées vont être perdues. Continuer quand même ?',
  'file.unsaved': 'Modifications non enregistrées',
  'file.errorNotJson':
    'Impossible d’ouvrir {file} : ce n’est pas un fichier de projet (.geii.json).',
  'file.errorNewer':
    'Impossible d’ouvrir {file} : il a été créé par une version plus récente du simulateur (format {version}).',
  'file.errorInvalid': 'Impossible d’ouvrir {file} : le projet a un problème ({detail}).',
  'file.close': 'Fermer',

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
  'kind.diode': 'Diode',
  'kind.capacitor': 'Condensateur',
  'kind.inductor': 'Bobine',

  'param.voltage': 'Tension',
  'param.resistance': 'Résistance',
  'param.ratedPower': 'Puissance nominale',
  'param.closed': 'Fermé',
  'param.forwardVoltage': 'Tension de seuil (Vf)',
  'param.seriesResistance': 'Résistance série',
  'param.maxCurrent': 'Courant maximal',
  'param.color': 'Couleur',
  'param.ratedVoltage': 'Tension nominale',
  'param.saturationCurrent': 'Courant de saturation (Is)',
  'param.emissionCoefficient': 'Coefficient d’émission (n)',
  'param.capacitance': 'Capacité',
  'param.initialVoltage': 'Tension initiale',
  'param.inductance': 'Inductance',
  'param.initialCurrent': 'Courant initial',

  'color.vermelho': 'rouge',
  'color.verde': 'vert',
  'color.azul': 'bleu',
  'color.amarelo': 'jaune',
  'color.branco': 'blanc',

  'props.label': 'Propriétés',
  'props.collapse': 'Réduire les propriétés',
  'props.expand': 'Ouvrir les propriétés',
  'props.multiTitle': '{count} composants sélectionnés',
  'props.multiHint':
    'Suppr les efface tous d’un coup (Ctrl+Z les remet). Ctrl+clic ajoute ou retire un composant.',
  'props.deleteAll': 'Supprimer les {count}',
  'props.empty':
    'Sélectionne un composant pour voir et modifier le nom, la valeur, l’unité et la rotation.',
  'props.position': 'Position',
  'props.rotation': 'Rotation',
  'props.rotate': 'Tourner',
  'props.duplicate': 'Dupliquer',
  'props.wireTitle': 'Fil',
  'props.wireHint':
    'Faites glisser un segment du fil pour le déplacer (haut/bas ou gauche/droite) et organiser le circuit. Double-clic sur le fil pour le redresser.',
  'props.straighten': 'Redresser le fil',
  'props.deleteWire': 'Supprimer le fil',
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
  'results.diodeOn': 'passante',
  'results.diodeOff': 'bloquée',
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
  'issue.source-short-inductor':
    '{name} est en court-circuit : en continu une bobine est un fil entre le + et le −.',
  'issue.led-in-transient':
    '{name} : la LED simple n’est pas prise en compte en transitoire. Utilisez une diode (menu Semi-conducteurs).',
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
