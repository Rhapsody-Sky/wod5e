import { generateRollMessageData } from '../../scripts/rolls/roll-message.js'
import { resolvePromptActor } from '../../applications/roll-menu/roll-menu-pool.js'

export async function processRollPrompt(context) {
  context.template = 'systems/wod5e/display/ui/chat/chat-message-roll-prompt.hbs'

  for (const [key, value] of Object.entries(context.messageData.promptedRolls)) {
    const actor = (await resolvePromptActor(key, value.actorUuid)) || value.actor
    const isOwner = Boolean(actor?.isOwner)
    const isVisible = Boolean(actor?.visible)
    let rollData
    if (value.rolled) {
      const roll = value.roll
      rollData = await generateRollMessageData({
        title: roll.options.title,
        roll,
        system: roll.options.system,
        difficulty: roll.options.difficulty || 0,
        activeModifiers: roll.options.activeModifiers || {},
        isContentVisible: context.isContentVisible
      })
    }

    context.messageData.promptedRolls[key] = {
      ...context.messageData.promptedRolls[key],
      actor,
      isCompatible: value.isCompatible !== false,
      canRoll: value.isCompatible !== false && isOwner,
      canRemove: isOwner,
      isVisible,
      rollData
    }
  }
}
