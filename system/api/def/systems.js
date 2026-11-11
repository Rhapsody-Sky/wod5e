import { getSystemFlags } from '../../scripts/fork-compatibility.js'
import { BaseDefinitionClass } from './base-definition-class.js'

export class Systems extends BaseDefinitionClass {
  // Run any necessary compilation on ready
  static onReady() {
    // Handle adding custom disciplines from any active modules
    const activeModules = game.modules.filter(
      (module) => module.active === true && getSystemFlags(module)
    )
    let customSystems = []
    activeModules.forEach((module) => {
      if (getSystemFlags(module).customSystems) {
        customSystems = customSystems.concat(getSystemFlags(module).customSystems)

        // Log the custom data in the console
        console.log(
          `World of Darkness 5e | Custom Systems added by ${module.id}: ${JSON.stringify(getSystemFlags(module).customSystems)}`
        )
      }
    })

    if (customSystems) {
      Systems.addCustom(customSystems)
    }

    Systems.setSortAlphabetically()
    Systems.initializeLabels()
  }

  static core = {
    label: 'WOD5E.Core',
    usesResourceOnAdvancedDice: false
  }

  static vampire = {
    label: 'TYPES.Actor.vampire',
    usesResourceOnAdvancedDice: true,
    resourceValuePath: 'hunger.value',
    resourceUsage: 'add'
  }

  static werewolf = {
    label: 'TYPES.Actor.werewolf',
    usesResourceOnAdvancedDice: true,
    resourceValuePath: 'rage.value',
    resourceUsage: 'subtract'
  }

  static hunter = {
    usesResourceOnAdvancedDice: false,
    label: 'TYPES.Actor.hunter'
  }

  static god = {
    usesResourceOnAdvancedDice: false,
    label: 'WOD5E.God.Label'
  }
}

// Hook to call onReady when the game is ready
Hooks.once('ready', Systems.onReady)
