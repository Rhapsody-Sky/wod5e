import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { _onAnyReroll } from '#system/scripts/any-reroll.js'
import { _onWillpowerReroll } from '#system/scripts/willpower-reroll.js'
import { WOD5eDice } from '#system/scripts/system-rolls.js'

vi.mock('#system/scripts/system-rolls.js', () => ({
  WOD5eDice: {
    Roll: vi.fn()
  }
}))

function createMessageElement({ rerollable = false } = {}) {
  const messageElement = document.createElement('li')
  messageElement.className = 'chat-message'
  messageElement.dataset.messageId = 'message-id'
  messageElement.innerHTML = Array.from(
    { length: 4 },
    (_, index) =>
      `<img class="die${rerollable ? ' rerollable' : ''}" data-index="${index}" src="die.svg">`
  ).join('')
  document.body.append(messageElement)
  return messageElement
}

describe('reroll handlers', () => {
  const syntheticActor = { id: 'synthetic', system: { gamesystem: 'god' } }
  let sourceMessage

  beforeEach(() => {
    WOD5eDice.Roll.mockReset()
    sourceMessage = {
      speakerActor: syntheticActor,
      rolls: [{ system: 'god', options: { rollMode: 'blindroll' } }],
      flags: {},
      speaker: { actor: 'base-actor', token: 'unlinked-token' }
    }
    game.messages = { get: () => sourceMessage }
    game.settings = { get: () => 'publicroll' }
    foundry.applications.api = {
      DialogV2: {
        prompt: vi.fn(async (options) => {
          const dialogElement = document.createElement('div')
          dialogElement.innerHTML = options.content
          options.render(null, { element: dialogElement })

          dialogElement.querySelectorAll('.die-select').forEach((die) => die.click())
          await options.ok.callback(null, null, { element: dialogElement })
        })
      }
    }
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('caps any reroll at three dice and preserves actor, system and roll mode', async () => {
    await _onAnyReroll(createMessageElement())

    expect(WOD5eDice.Roll).toHaveBeenCalledOnce()
    expect(WOD5eDice.Roll).toHaveBeenCalledWith(
      expect.objectContaining({
        actor: syntheticActor,
        basicDice: 3,
        advancedDice: 0,
        system: 'god',
        rollMode: 'blindroll'
      })
    )
  })

  it('supports a Foundry data-action call for a willpower reroll', async () => {
    const messageElement = createMessageElement({ rerollable: true })
    const button = document.createElement('button')
    messageElement.append(button)

    await _onWillpowerReroll(new Event('click'), button)

    expect(WOD5eDice.Roll).toHaveBeenCalledWith(
      expect.objectContaining({
        actor: syntheticActor,
        basicDice: 3,
        system: 'god',
        willpowerDamage: 1
      })
    )
  })
})
