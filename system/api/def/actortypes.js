// Base definition class
import { BaseDefinitionClass } from './base-definition-class.js'
// All systems
import { SPCActorSheet } from '../../actor/spc-actor-sheet.js'
import { GodActorSheet } from '../../actor/god-actor-sheet.js'
import { GroupActorSheet } from '../../actor/group-actor-sheet.js'
// Mortal
import { MortalActorSheet } from '../../actor/mortal-actor-sheet.js'
// Vampire system
import { VampireActorSheet } from '../../actor/vtm/vampire-actor-sheet.js'
import { GhoulActorSheet } from '../../actor/vtm/ghoul-actor-sheet.js'
// Hunter system
import { HunterActorSheet } from '../../actor/htr/hunter-actor-sheet.js'
// Werewolf system
import { WerewolfActorSheet } from '../../actor/wta/werewolf-actor-sheet.js'
// Actor models
import { WoDActorModel } from '../../actor/data-models/base-actor-model.js'
import { SPCActorModel } from '../../actor/data-models/spc-actor-model.js'
import { GodActorModel } from '../../actor/data-models/god-actor-model.js'
import { GroupActorModel } from '../../actor/data-models/group-actor-model.js'

export class ActorTypes extends BaseDefinitionClass {
  // Run any necessary compilation on ready
  static onReady() {
    ActorTypes.setSortAlphabetically()
    ActorTypes.initializeLabels()
  }

  static mortal = {
    label: 'WOD5E.Mortal',
    types: ['mortal'],
    sheetClass: MortalActorSheet,
    sheetModel: WoDActorModel
  }

  static spc = {
    label: 'WOD5E.SPC.Label',
    types: ['spc'],
    sheetClass: SPCActorSheet,
    sheetModel: SPCActorModel
  }

  static god = {
    label: 'WOD5E.God.Label',
    types: ['god'],
    sheetClass: GodActorSheet,
    sheetModel: GodActorModel
  }

  static vampire = {
    label: 'TYPES.Actor.vampire',
    types: ['vampire'],
    sheetClass: VampireActorSheet,
    sheetModel: WoDActorModel
  }

  static ghoul = {
    label: 'WOD5E.VTM.Ghoul',
    types: ['ghoul'],
    sheetClass: GhoulActorSheet,
    sheetModel: WoDActorModel
  }

  static hunter = {
    label: 'TYPES.Actor.hunter',
    types: ['hunter'],
    sheetClass: HunterActorSheet,
    sheetModel: WoDActorModel
  }

  static werewolf = {
    label: 'TYPES.Actor.werewolf',
    types: ['werewolf'],
    sheetClass: WerewolfActorSheet,
    sheetModel: WoDActorModel
  }

  static group = {
    label: 'WOD5E.GroupSheet',
    types: ['group'],
    sheetClass: GroupActorSheet,
    sheetModel: GroupActorModel
  }
}

// Hook to call onReady when the game is ready
Hooks.once('ready', ActorTypes.onReady)
