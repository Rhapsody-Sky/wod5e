import {
  _onGodAttributeRoll,
  _onRollSingleGodAttribute,
  _onSelectGodAttribute
} from './scripts/god-attribute-roll.js'
import {
  DIVINE_ATTRIBUTE_DISPLAY_ORDER,
  getDivineAttributeLabelKey
} from './scripts/god-attributes.js'
import { SPCActorSheet } from './spc-actor-sheet.js'

/**
 * A Story Character-based sheet for gods with five combinable attributes.
 * @extends {SPCActorSheet}
 */
export class GodActorSheet extends SPCActorSheet {
  static DEFAULT_OPTIONS = {
    classes: ['wod5e', 'actor', 'spc', 'god', 'sheet'],
    actions: {
      godAttributeRoll: _onGodAttributeRoll,
      rollSingleGodAttribute: _onRollSingleGodAttribute,
      selectGodAttribute: _onSelectGodAttribute
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
      context.divineAttributes = DIVINE_ATTRIBUTE_DISPLAY_ORDER.map((id) => {
        const label = game.i18n.localize(getDivineAttributeLabelKey(id))
        return {
          id,
          label,
          icon: `systems/wod5e-gods/assets/icons/god/${id}.png`,
          value: attributes[id].value,
          selected: this._selectedGodAttributeId === id,
          pairSelectionLabel: game.i18n.format('WOD5E.God.SelectForPair', {
            attribute: label
          }),
          singleRollLabel: game.i18n.format('WOD5E.God.RollSingleAttribute', {
            attribute: label
          })
        }
      })
      context.godAttributeSelectionStatusId = `${this.id}-god-attribute-selection-status`
      context.godAttributeSelectionHint = this._selectedGodAttributeId
        ? game.i18n.format('WOD5E.God.PairSelectionActive', {
            attribute: game.i18n.localize(getDivineAttributeLabelKey(this._selectedGodAttributeId))
          })
        : game.i18n.localize('WOD5E.God.PairSelectionIdle')
    }

    return context
  }
}
