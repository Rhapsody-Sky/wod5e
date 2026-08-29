const GOD_ATTRIBUTE_LABELS = {
  aspect: 'WOD5E.God.AttributeList.aspect',
  identity: 'WOD5E.God.AttributeList.identity',
  insight: 'WOD5E.God.AttributeList.insight',
  power: 'WOD5E.God.AttributeList.power',
  force: 'WOD5E.God.AttributeList.force'
}

/**
 * Return the divine attributes in the shape expected by Foundry's selectOptions helper.
 *
 * @param {Function} localize Foundry-compatible localization function.
 * @returns {object<string, string>}
 */
export function getDivineAttributeOptions(localize = (key) => key) {
  return Object.fromEntries(
    Object.entries(GOD_ATTRIBUTE_LABELS).map(([id, label]) => [id, localize(label)])
  )
}

/**
 * Convert a saved Roll Menu entry into the paths, selectors, and display label used by rolls.
 * Old saved rolls have no system field and intentionally retain the legacy Core behaviour.
 *
 * @param {object} activeRoll Saved Roll Menu entry.
 * @param {object} options Definitions and localization used to make a human-readable label.
 * @returns {{system: string, valuePaths: string, selectors: string,
 *   disableAdvancedDice: boolean, label: string, hasDuplicate: boolean}}
 */
export function buildRollMenuPool(
  activeRoll = {},
  { skillOptions = {}, attributeOptions = {}, localize = (key) => key } = {}
) {
  const system = activeRoll.system || 'core'
  const dice = activeRoll.dice || {}

  if (system === 'god') {
    const requestedAttributes = [dice.divineAttribute, dice.divineAttribute2].filter(Boolean)
    const attributeIds = [...new Set(requestedAttributes)]
    const labels = attributeIds.map((id) =>
      localize(GOD_ATTRIBUTE_LABELS[id] || `WOD5E.God.AttributeList.${id}`)
    )

    return {
      system,
      valuePaths: attributeIds.map((id) => `divineattributes.${id}.value`).join(' '),
      selectors: ['divineattributes', ...attributeIds.map((id) => `divineattributes.${id}`)].join(
        ' '
      ),
      disableAdvancedDice: true,
      label: labels.join(' + '),
      hasDuplicate: requestedAttributes.length !== attributeIds.length
    }
  }

  const selectedDice = [
    ['skill', 'skills', skillOptions],
    ['attribute', 'attributes', attributeOptions]
  ].filter(([key]) => dice[key])
  const valuePaths = selectedDice.map(([key, type]) => `${type}.${dice[key]}.value`)
  const selectors = selectedDice.flatMap(([key, type, definitions]) => {
    const selectorList = [type, `${type}.${dice[key]}`]

    if (type === 'attributes' && definitions[dice[key]]?.type) {
      selectorList.push(definitions[dice[key]].type)
    }

    return selectorList
  })
  const labels = selectedDice.map(([key, , definitions]) =>
    resolveDefinitionLabel(definitions[dice[key]], dice[key], localize)
  )

  return {
    system,
    valuePaths: valuePaths.join(' '),
    selectors: selectors.join(' '),
    disableAdvancedDice: false,
    label: labels.join(' + '),
    hasDuplicate: false
  }
}

/**
 * Test whether an actor can resolve paths belonging to the selected Roll Menu system.
 * Core is deliberately universal for backwards compatibility with existing saved rolls.
 *
 * @param {Actor} actor Actor being prompted or rolled.
 * @param {string} system Saved Roll Menu system.
 * @returns {boolean}
 */
export function isActorCompatibleWithRollSystem(actor, system = 'core') {
  return system === 'core' || actor?.system?.gamesystem === system
}

/** Resolve linked and synthetic actors stored on a roll prompt. */
export async function resolvePromptActor(actorId, actorUuid) {
  if (actorUuid && typeof globalThis.fromUuid === 'function') {
    try {
      const document = await globalThis.fromUuid(actorUuid)
      const actor = document?.documentName === 'Actor' ? document : document?.actor
      if (actor) return actor
    } catch (error) {
      console.warn(`World of Darkness 5e | Unable to resolve prompted actor ${actorUuid}`, error)
    }
  }

  return globalThis.game?.actors?.get?.(actorId) || null
}

function resolveDefinitionLabel(definition, fallback, localize) {
  const label =
    typeof definition === 'string'
      ? definition
      : definition?.displayName || definition?.rename || definition?.label || fallback

  return typeof label === 'string' && label.includes('.') ? localize(label) : label
}
