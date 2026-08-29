export const MAX_REROLL_DICE = 3

/**
 * Normalize reroll calls from both chat context-menu callbacks and Foundry
 * data-action handlers to the containing chat message element.
 *
 * @param {Event|HTMLElement} eventOrElement Context element or action event
 * @param {HTMLElement} [target] Foundry data-action target
 * @returns {HTMLElement|null} The containing chat message element
 */
export function resolveRerollMessageElement(eventOrElement, target) {
  const source = target || eventOrElement?.currentTarget || eventOrElement?.target || eventOrElement

  if (source?.matches?.('.chat-message[data-message-id]')) return source

  return source?.closest?.('.chat-message[data-message-id]') || null
}

/**
 * Resolve the actor associated with a chat message, including synthetic actors
 * belonging to unlinked tokens.
 *
 * @param {ChatMessage} message The source chat message
 * @returns {Actor|null} The associated actor, if one can be found
 */
export function resolveMessageActor(message) {
  if (!message) return null

  // Foundry's speakerActor getter handles linked and unlinked token actors.
  if (message.speakerActor) return message.speakerActor

  const speaker = message.speaker || {}
  const scene = globalThis.game?.scenes?.get?.(speaker.scene)
  const tokenActor = scene?.tokens?.get?.(speaker.token)?.actor

  if (tokenActor) return tokenActor

  // Retain compatibility with the legacy synthetic-token actor collection.
  const legacyTokenActor = globalThis.game?.actors?.tokens?.[speaker.token]
  if (legacyTokenActor) return legacyTokenActor

  return globalThis.game?.actors?.get?.(speaker.actor) || null
}

/**
 * Resolve the game system used by the original roll.
 *
 * @param {ChatMessage} message The source chat message
 * @returns {string} The system identifier used by the roll
 */
export function resolveMessageSystem(message) {
  const roll = message?.rolls?.[0]
  const candidates = [
    roll?.system,
    roll?.options?.system,
    resolveMessageActor(message)?.system?.gamesystem,
    message?.flags?.gamesystem,
    message?.flags?.system
  ]

  return candidates.find((candidate) => typeof candidate === 'string' && candidate) || 'mortal'
}

/**
 * Preserve the roll mode of the original chat roll when rerolling.
 *
 * @param {ChatMessage} message The source chat message
 * @returns {string} Foundry roll mode identifier
 */
export function resolveMessageRollMode(message) {
  return (
    message?.rolls?.[0]?.options?.rollMode ||
    message?.flags?.rollMode ||
    globalThis.game?.settings?.get?.('core', 'rollMode')
  )
}

/**
 * Toggle a reroll die while enforcing the maximum selection count.
 *
 * @param {HTMLElement} die The die selection element
 * @param {HTMLElement} container The current dialog's reroll container
 * @returns {boolean} Whether the selection changed
 */
export function toggleRerollDie(die, container) {
  if (die.classList.contains('selected')) {
    die.classList.remove('selected')
    return true
  }

  if (container.querySelectorAll('.die-select.selected').length >= MAX_REROLL_DICE) return false

  die.classList.add('selected')
  return true
}

/**
 * Get the selected dice from the current reroll dialog.
 *
 * @param {HTMLElement} dialogElement The current dialog element
 * @param {string} containerSelector Selector for the reroll dice container
 * @returns {HTMLElement[]} Selected dice, or an empty array for an invalid selection
 */
export function getSelectedRerollDice(dialogElement, containerSelector) {
  const selectedDice = Array.from(
    dialogElement?.querySelectorAll(`${containerSelector} .die-select.selected`) || []
  )

  return selectedDice.length <= MAX_REROLL_DICE ? selectedDice : []
}
