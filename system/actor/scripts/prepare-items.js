/**
 * Collect active roll modifiers from an actor's embedded items.
 *
 * Keeping these modifiers on the actor data makes them available to every
 * roll entry point, including token and hotbar rolls that never render a
 * character sheet first.
 *
 * @param {Iterable<Item>} items The actor's embedded items
 * @returns {object[]} A fresh, flattened list of active item modifiers
 */
export function collectItemModifiers(items = []) {
  return getItemArray(items).reduce((modifiers, item) => {
    const bonuses = item.system?.bonuses

    if (item.system?.suppressed || !Array.isArray(bonuses)) {
      return modifiers
    }

    modifiers.push(...bonuses)
    return modifiers
  }, [])
}

/**
 * Enrich item descriptions used by actor sheet templates.
 *
 * Description enrichment belongs to rendering and is deliberately separate
 * from actor data preparation. Promise.all ensures the sheet does not render
 * before the asynchronous enrichment has completed.
 *
 * @param {Iterable<Item>} items The items displayed on the actor sheet
 * @returns {Promise<void>}
 */
export async function enrichItemDescriptions(items = []) {
  await Promise.all(
    getItemArray(items).map(async (item) => {
      const description = item.system?.description
      if (!description) return

      item.system.enrichedDescription =
        await foundry.applications.ux.TextEditor.implementation.enrichHTML(description)
    })
  )
}

function getItemArray(items) {
  if (Array.isArray(items)) return items
  if (Array.isArray(items?.contents)) return items.contents
  if (typeof items?.values === 'function') return Array.from(items.values())

  return Array.from(items ?? [])
}
