const GOD_ATTRIBUTE_LABELS = {
  aspect: 'WOD5E.God.AttributeList.aspect',
  identity: 'WOD5E.God.AttributeList.identity',
  insight: 'WOD5E.God.AttributeList.insight',
  power: 'WOD5E.God.AttributeList.power',
  force: 'WOD5E.God.AttributeList.force'
}

/**
 * Build the common dataset used by direct, paired, and dialog-based God rolls.
 *
 * @param {string[]} attributeIds One or two divine attribute IDs.
 * @param {Function} localize Foundry-compatible localization function.
 * @returns {object}
 */
export function buildGodAttributeRollDataset(attributeIds, localize = (key) => key) {
  const uniqueIds = [...new Set(attributeIds.filter((id) => GOD_ATTRIBUTE_LABELS[id]))].slice(0, 2)
  const labels = uniqueIds.map((id) => localize(GOD_ATTRIBUTE_LABELS[id]))

  return {
    label: labels.join(' + '),
    valuePaths: uniqueIds.map((id) => `divineattributes.${id}.value`).join(' '),
    selectors: ['divineattributes', ...uniqueIds.map((id) => `divineattributes.${id}`)].join(' '),
    disableAdvancedDice: true
  }
}

/**
 * Select an attribute for a direct paired roll. Shift-click, the dedicated die button,
 * or selecting the same attribute twice performs a single-attribute roll.
 */
export const _onSelectGodAttribute = async function (event, target) {
  event.preventDefault()

  const attributeId = getAttributeId(event, target)
  if (!attributeId) return

  if (event.shiftKey) {
    clearGodAttributeSelection(this)
    return rollGodAttributes(this.actor, [attributeId])
  }

  const selectedAttributeId = this._selectedGodAttributeId
  if (!selectedAttributeId) {
    this._selectedGodAttributeId = attributeId
    updateGodAttributeSelection(this, attributeId)
    return
  }

  clearGodAttributeSelection(this)

  if (selectedAttributeId === attributeId) {
    return rollGodAttributes(this.actor, [attributeId])
  }

  return rollGodAttributes(this.actor, [selectedAttributeId, attributeId])
}

/** Perform an explicit single-attribute roll from the small die button. */
export const _onRollSingleGodAttribute = async function (event, target) {
  event.preventDefault()

  const attributeId = getAttributeId(event, target)
  if (!attributeId) return

  clearGodAttributeSelection(this)
  return rollGodAttributes(this.actor, [attributeId])
}

/** Open the original two-attribute dialog as a discoverable fallback. */
export const _onGodAttributeRoll = async function (event) {
  event.preventDefault()

  const attributes = getGodAttributes(this.actor)
  const content = await foundry.applications.handlebars.renderTemplate(
    'systems/wod5e/display/shared/actors/parts/god/attribute-roll-dialog.hbs',
    { attributes }
  )

  const result = await foundry.applications.api.DialogV2.input({
    window: {
      title: game.i18n.localize('WOD5E.God.SelectAttributes')
    },
    content,
    ok: {
      icon: 'fas fa-dice',
      label: game.i18n.localize('WOD5E.Confirm')
    },
    buttons: [
      {
        action: 'cancel',
        icon: 'fas fa-times',
        label: game.i18n.localize('WOD5E.Cancel')
      }
    ],
    classes: ['wod5e', 'god']
  })

  if (result === 'cancel') return

  const firstId = result.firstAttribute
  const secondId = result.secondAttribute

  if (!firstId || !secondId) {
    return ui.notifications.warn(game.i18n.localize('WOD5E.God.SelectTwoAttributes'))
  }

  if (firstId === secondId) {
    return ui.notifications.warn(game.i18n.localize('WOD5E.God.AttributesMustDiffer'))
  }

  clearGodAttributeSelection(this)
  return rollGodAttributes(this.actor, [firstId, secondId])
}

export function rollGodAttributes(actor, attributeIds) {
  const availableIds = new Set(Object.keys(actor?.system?.divineattributes || {}))
  const validIds = [...new Set(attributeIds)].filter((id) => availableIds.has(id)).slice(0, 2)

  if (validIds.length === 0) {
    return ui.notifications.warn(game.i18n.localize('WOD5E.God.SelectAttribute'))
  }

  return WOD5E.api.RollFromDataset({
    actor,
    dataset: buildGodAttributeRollDataset(validIds, (key) => game.i18n.localize(key))
  })
}

function getGodAttributes(actor) {
  return Object.keys(actor.system.divineattributes).map((id) => ({
    id,
    label: game.i18n.localize(GOD_ATTRIBUTE_LABELS[id] || `WOD5E.God.AttributeList.${id}`)
  }))
}

function getAttributeId(event, target) {
  const actionTarget =
    target || event.currentTarget || event.target?.closest?.('[data-attribute-id]')
  return actionTarget?.dataset?.attributeId
}

function clearGodAttributeSelection(sheet) {
  sheet._selectedGodAttributeId = null
  updateGodAttributeSelection(sheet, null)
}

function updateGodAttributeSelection(sheet, selectedAttributeId) {
  const root = sheet.element
  if (!root) return

  root.querySelectorAll('.god-attribute').forEach((attributeElement) => {
    const invocation = attributeElement.querySelector('.god-attribute-invocation')
    const isSelected = invocation?.dataset.attributeId === selectedAttributeId

    attributeElement.classList.toggle('is-selected', isSelected)
    invocation?.setAttribute('aria-pressed', String(isSelected))
  })

  const status = root.querySelector('.god-attribute-selection-status')
  if (!status) return

  status.textContent = selectedAttributeId
    ? game.i18n.format('WOD5E.God.PairSelectionActive', {
        attribute: game.i18n.localize(GOD_ATTRIBUTE_LABELS[selectedAttributeId])
      })
    : game.i18n.localize('WOD5E.God.PairSelectionIdle')
}
