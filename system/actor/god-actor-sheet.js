import {
  _onGodAttributeRoll,
  _onRollSingleGodAttribute,
  _onSelectGodAttribute
} from './scripts/god-attribute-roll.js'
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
      template: 'systems/wod5e/display/shared/actors/parts/god/stats.hbs'
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
      context.divineAttributes = Object.entries(this.actor.system.divineattributes).map(
        ([id, attribute]) => ({
          id,
          label: game.i18n.localize(`WOD5E.God.AttributeList.${id}`),
          icon: `systems/wod5e/assets/icons/god/${id}.png`,
          value: attribute.value,
          selected: this._selectedGodAttributeId === id,
          pairSelectionLabel: game.i18n.format('WOD5E.God.SelectForPair', {
            attribute: game.i18n.localize(`WOD5E.God.AttributeList.${id}`)
          }),
          singleRollLabel: game.i18n.format('WOD5E.God.RollSingleAttribute', {
            attribute: game.i18n.localize(`WOD5E.God.AttributeList.${id}`)
          })
        })
      )
      context.godAttributeSelectionStatusId = `${this.id}-god-attribute-selection-status`
      context.godAttributeSelectionHint = this._selectedGodAttributeId
        ? game.i18n.format('WOD5E.God.PairSelectionActive', {
            attribute: game.i18n.localize(`WOD5E.God.AttributeList.${this._selectedGodAttributeId}`)
          })
        : game.i18n.localize('WOD5E.God.PairSelectionIdle')
    }

    return context
  }
}
