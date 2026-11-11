import { _onGodAttributeRoll } from './scripts/god-attribute-roll.js'
import { SPCActorSheet } from './spc-actor-sheet.js'

const DIVINE_ATTRIBUTE_DISPLAY_ORDER = ['aspect', 'identity', 'power', 'force', 'insight']

/**
 * A Story Character-based sheet for gods with five combinable attributes.
 * @extends {SPCActorSheet}
 */
export class GodActorSheet extends SPCActorSheet {
  static DEFAULT_OPTIONS = {
    classes: ['wod5e', 'actor', 'spc', 'god', 'sheet'],
    actions: {
      godAttributeRoll: _onGodAttributeRoll
    }
  }

  static PARTS = {
    ...SPCActorSheet.PARTS,
    stats: {
      template: 'systems/wod5e-gods/display/shared/actors/parts/god/stats.hbs'
    }
  }

  async _prepareContext() {
    const context = await super._prepareContext()
    context.healthLabel = 'WOD5E.God.Influence'

    return context
  }

  async _preparePartContext(partId, context, options) {
    context = { ...(await super._preparePartContext(partId, context, options)) }

    if (partId === 'stats') {
      const attributes = this.actor.system.divineattributes
      context.divineAttributes = DIVINE_ATTRIBUTE_DISPLAY_ORDER.map((id) => ({
        id,
        label: game.i18n.localize(`WOD5E.God.AttributeList.${id}`),
        icon: `systems/wod5e-gods/assets/icons/god/${id}.png`,
        value: attributes[id].value
      }))
    }

    return context
  }
}
