import { getSystemFlag } from '../../../scripts/fork-compatibility.js'
import { resolveMessageActor } from '../../../scripts/reroll-helpers.js'
import { buildRollMenuPool, isActorCompatibleWithRollSystem } from '../roll-menu-pool.js'

export const _onRollFromMenu = async function (event, target) {
  const actionTarget = target || event.target?.closest?.('[data-action]') || event.currentTarget
  const dataset = actionTarget?.dataset || {}
  let rollId
  let savedRolls = []

  // Ensure we have a valid actor selected
  const actor = resolveMessageActor({ speaker: ChatMessage.getSpeaker() })
  if (!actor) {
    return ui.notifications.warn(game.i18n.localize('WOD5E.Notifications.NoTokenSelected'))
  }

  // Get the saved roll ID from either the ID passed through the dataset, or the currently active roll
  if (dataset?.id) {
    // Data array expected format: {User}.{ID}
    const dataArray = dataset?.id.split('.')
    const dataUser = dataArray[0] || ''
    const dataId = dataArray[1] || ''

    // If we have an ID, we use that
    savedRolls = getSystemFlag(game.users.get(dataUser), 'rollMenuSavedRolls')
    rollId = dataId
  } else {
    // If we don't have an ID provided in the dataset, we use the user's personal currently set active roll
    savedRolls = await getSystemFlag(game.users.current, 'rollMenuSavedRolls')
    rollId = await getSystemFlag(game.users.current, 'rollMenuActiveRoll')
  }

  // Finally pull the details of the roll we should be using
  const activeRollObject = savedRolls?.[rollId]

  // Check to make sure the lookup actually returned something
  if (!activeRollObject) {
    ui.notifications.warn(
      game.i18n.format('WOD5E.Notifications.RollIdNotFound', {
        string: rollId
      })
    )

    return
  }

  const pool = buildRollMenuPool(activeRollObject, {
    skillOptions: WOD5E.Skills.getList({}),
    attributeOptions: WOD5E.Attributes.getList({}),
    localize: (key) => game.i18n.localize(key)
  })

  if (pool.hasDuplicate) {
    return ui.notifications.warn(game.i18n.localize('WOD5E.God.AttributesMustDiffer'))
  }
  if (pool.system === 'god' && !pool.valuePaths) {
    return ui.notifications.warn(game.i18n.localize('WOD5E.God.SelectAttribute'))
  }

  if (!isActorCompatibleWithRollSystem(actor, pool.system)) {
    const systemDefinition = WOD5E.Systems.getList({})[pool.system]
    const systemLabel = systemDefinition?.displayName || systemDefinition?.label || pool.system

    return ui.notifications.warn(
      game.i18n.format('WOD5E.RollList.ActorSystemMismatch', { system: systemLabel })
    )
  }

  // Pipe the roll to our RollFromDataset function
  return WOD5E.api.RollFromDataset({
    dataset: {
      label: activeRollObject.name || pool.label,
      valuePaths: pool.valuePaths,
      selectors: pool.selectors,
      disableAdvancedDice: pool.disableAdvancedDice,
      difficulty: activeRollObject.difficulty
    },
    actor
  })
}
