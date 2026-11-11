import { generateRollMessageData } from '../../scripts/rolls/roll-message.js'
import { resolvePromptActor } from '../../applications/roll-menu/roll-menu-pool.js'

export async function processRollPrompt(context) {
  context.template = 'systems/wod5e-gods/display/ui/chat/chat-message-roll-prompt.hbs'

  // Keep derived actors and visibility flags in render data, not in the stored message.
  const renderedRolls = {}
  for (const [key, value] of Object.entries(context.messageData.promptedRolls ?? {})) {
    const actor = (await resolvePromptActor(key, value.actorUuid)) || value.actor
    const isOwner = Boolean(actor?.isOwner)
    const isVisible = Boolean(actor?.visible)
    let rollData
    if (value.rolled && value.roll) {
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

    renderedRolls[key] = {
      ...value,
      actor,
      isCompatible: value.isCompatible !== false,
      canRoll: value.isCompatible !== false && isOwner,
      canRemove: isOwner,
      isVisible,
      rollData
    }
  }
  context.messageData.promptedRolls = renderedRolls
}
