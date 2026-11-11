import { getSystemFlag } from '../../../scripts/fork-compatibility.js'
import { SYSTEM_ID } from '../../../constants.js'
import { isActorCompatibleWithRollSystem } from '../roll-menu-pool.js'

export const _onAddSelectedTokens = async function (event, target) {
  event.preventDefault()

  // Grab the chat message we're modifying
  const messageID = target.closest('.chat-message').getAttribute('data-message-id')
  const chatMessage = game.messages.get(messageID)
  if (!chatMessage) return

  // Use the list of currently controlled tokens to generate a map and make the necessary user objects
  const tokens = canvas.tokens.controlled
  const actorsList = tokens.map((i) => i.actor).filter(Boolean)
  const oldActorsList = getSystemFlag(chatMessage, 'promptedRolls') || {}
  const rollSystem = getSystemFlag(chatMessage, 'rollSystem') || 'core'
  const newActorsList = {}
  actorsList.forEach((actor) => {
    if (oldActorsList[actor.id]) return

    newActorsList[actor.id] = {
      actorUuid: actor.uuid,
      rolled: false,
      isCompatible: isActorCompatibleWithRollSystem(actor, rollSystem)
    }
  })

  // Update the promptedRolls flag of the chat message with the new object we've created
  return chatMessage.setFlag(SYSTEM_ID, 'promptedRolls', { ...oldActorsList, ...newActorsList })
}
