// Import modules
import { WOD5eDice } from './system-rolls.js'
import {
  MAX_REROLL_DICE,
  getSelectedRerollDice,
  resolveMessageActor,
  resolveRerollMessageElement,
  resolveMessageRollMode,
  resolveMessageSystem,
  toggleRerollDie
} from './reroll-helpers.js'

/**
 * Initalise willpower rerolls and its functions
 **/

export const _onWillpowerReroll = async (eventOrElement, target) => {
  const roll = resolveRerollMessageElement(eventOrElement, target)
  if (!roll) return

  // Variables
  const dice = roll.querySelectorAll('.rerollable')
  const diceRolls = []
  const messageId = roll.getAttribute('data-message-id')
  const message = game.messages.get(messageId)
  const system = resolveMessageSystem(message)

  // Go through the message's dice and add them to the diceRolls array
  Object.keys(dice).forEach((i) => {
    // Filter out non-numeric keys like "prevObject" and "length"
    if (!isNaN(Number(i))) {
      diceRolls.push(`<div class="die-select">${dice[i].outerHTML}</div>`)
    }
  })

  // Create dialog for rerolling dice
  const content = `
    <form>
      <div class="window-content">
        <label><b>${game.i18n.format('WOD5E.Chat.SelectDiceToReroll', { maximum: MAX_REROLL_DICE })}</b></label>
        <hr>
        <span class="dice-tooltip">
          <div class="dice-rolls flexrow willpower-reroll">
            ${diceRolls.join('')}
          </div>
        </span>
      </div>
    </form>`

  // Prompt dialog
  await foundry.applications.api.DialogV2.prompt({
    window: {
      title: game.i18n.localize('WOD5E.Chat.WillpowerReroll')
    },
    classes: ['wod5e', system, 'dialog'],
    content,
    ok: {
      label: game.i18n.localize('WOD5E.Chat.Reroll'),
      callback: (_event, _button, dialog) => rerollDie(roll, dialog.element)
    },
    cancel: {
      label: game.i18n.localize('WOD5E.Cancel')
    },
    modal: true,
    render: (event, dialog) => {
      const rerollableDie = dialog.element.querySelectorAll('.willpower-reroll .die-select')
      const rerollContainer = dialog.element.querySelector('.willpower-reroll')

      rerollableDie.forEach((die) => {
        die.addEventListener('click', () => toggleRerollDie(die, rerollContainer))
      })
    }
  })

  // Handles rerolling the number of dice selected
  async function rerollDie(roll, dialogElement) {
    // Variables
    const diceSelected = getSelectedRerollDice(dialogElement, '.willpower-reroll')
    const rageDiceSelected = diceSelected.filter((die) => die.querySelector('.rage-dice'))
    const selectors = ['willpower-reroll']

    // Get the actor associated with the message
    // Theoretically I should error-check this, but there shouldn't be any
    // messages that call for a WillpowerReroll without an associated actor
    const messageId = roll.getAttribute('data-message-id')
    const message = game.messages.get(messageId)
    const actor = resolveMessageActor(message)
    // Get the rollMode associated with the message
    const rollMode = resolveMessageRollMode(message)

    // If there is at least 1 die selected and aren't any more than 3 die selected, reroll the total number of die and generate a new message.
    if (diceSelected.length > 0 && diceSelected.length < 4) {
      WOD5eDice.Roll({
        basicDice: diceSelected.length - rageDiceSelected.length,
        advancedDice: rageDiceSelected.length,
        title: game.i18n.localize('WOD5E.Chat.WillpowerReroll'),
        actor,
        willpowerDamage: actor ? 1 : 0, // If no actor is set, we don't need to damage any willpower
        quickRoll: true,
        rollMode,
        selectors,
        disableMessageOutput: true,
        system,
        callback: async (err, reroll) => {
          if (err) console.log('World of Darkness 5e | ' + err)

          const messageRolls = message.rolls

          diceSelected.forEach((dieHTML) => {
            const imgElement = dieHTML.querySelector('img')

            if (!imgElement) {
              console.error('World of Darkness 5e | Image element not found in dieHTML:', dieHTML)
              return // Skip this iteration if image element is not found
            }

            const dieIndex = parseInt(imgElement.getAttribute('data-index'))

            if (imgElement.classList.contains('rage-dice')) {
              const die = messageRolls[0].terms[2].results.find((die) => die.index === dieIndex)

              if (die) {
                die.discarded = true
                die.active = false
              } else {
                console.error('World of Darkness 5e | Die not found in rage diceset:', dieIndex)
              }
            } else {
              const die = messageRolls[0].terms[0].results.find((die) => die.index === dieIndex)

              if (die) {
                die.discarded = true
                die.active = false
              } else {
                console.error('World of Darkness 5e | Die not found in base diceset:', dieIndex)
              }
            }
          })

          // Merge "results" arrays
          messageRolls[0].terms[0].results = messageRolls[0].terms[0].results.concat(
            reroll.terms[0].results
          )

          // Only merge the 2nd dicepool if one even exists
          if (messageRolls[0].terms[2])
            messageRolls[0].terms[2].results = messageRolls[0].terms[2].results.concat(
              reroll.terms[2].results
            )

          message.update({
            rolls: messageRolls
          })
        }
      })
    }
  }
}
