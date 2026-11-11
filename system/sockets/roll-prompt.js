import { getSystemFlag } from '../scripts/fork-compatibility.js'

export async function RollPromptSockets() {
  game.socket.on('system.wod5e-gods', async (data) => {
    const chatMessage = game.messages.get(data.messageID)

    if (data.action === 'updateRollPrompt' && chatMessage.isOwner)
      updateRollPrompt(data, chatMessage)

    if (data.action === 'removeActor' && chatMessage.isOwner)
      removeActorFromRollPrompt(data, chatMessage)
  })
}

export async function updateRollPrompt(data) {
  const chatMessage = game.messages.get(data.messageID)
  const promptedRollsList = getSystemFlag(chatMessage, 'promptedRolls')

  const actorObject = promptedRollsList[data.actorID]
  if (!actorObject) return

  const updatedList = foundry.utils.mergeObject(promptedRollsList, {
    [data.actorID]: {
      rolled: true,
      roll: foundry.dice.Roll.fromData(data.roll)
    }
  })

  await chatMessage.setFlag('wod5e-gods', 'promptedRolls', updatedList)
}

export async function removeActorFromRollPrompt(data) {
  const chatMessage = game.messages.get(data.messageID)

  chatMessage.update({ [`flags.wod5e-gods.promptedRolls.-=${data.actorID}`]: null })
}
