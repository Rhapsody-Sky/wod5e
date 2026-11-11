import { resolvePromptActor } from '../roll-menu-pool.js'

export const _onRollFromChat = async function (event, target) {
  event.preventDefault()

  // Resolve linked actors and synthetic actors belonging to unlinked tokens.
  const actor = await resolvePromptActor(
    target.getAttribute('data-actor-id') || ChatMessage.getSpeaker().actor,
    target.getAttribute('data-actor-uuid')
  )

  if (!actor) {
    return ui.notifications.warn(game.i18n.localize('WOD5E.Notifications.NoTokenSelected'))
  }

  const dataset = $(target).data()

  // Pipe the roll to our RollFromDataset function
  WOD5E.api.RollFromDataset({
    dataset,
    actor
  })
}
