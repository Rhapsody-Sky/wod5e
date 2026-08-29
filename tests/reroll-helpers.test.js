import { afterEach, describe, expect, it } from 'vitest'

import {
  getSelectedRerollDice,
  resolveMessageActor,
  resolveRerollMessageElement,
  resolveMessageRollMode,
  resolveMessageSystem,
  toggleRerollDie
} from '#system/scripts/reroll-helpers.js'

describe('reroll helpers', () => {
  afterEach(() => {
    document.body.innerHTML = ''
    game.actors = undefined
    game.scenes = undefined
  })

  it('resolves a synthetic actor directly from the source message', () => {
    const syntheticActor = { id: 'synthetic', system: { gamesystem: 'werewolf' } }
    const message = {
      speakerActor: syntheticActor,
      speaker: { actor: 'base-actor', token: 'unlinked-token' }
    }

    expect(resolveMessageActor(message)).toBe(syntheticActor)
  })

  it('falls back to the token actor in the speaker scene', () => {
    const syntheticActor = { id: 'scene-token-actor' }
    game.scenes = {
      get: () => ({
        tokens: {
          get: () => ({ actor: syntheticActor })
        }
      })
    }

    expect(resolveMessageActor({ speaker: { scene: 'scene-id', token: 'unlinked-token' } })).toBe(
      syntheticActor
    )
  })

  it('uses the original roll system rather than unrelated message flags', () => {
    const message = {
      rolls: [{ system: 'god', options: { system: 'vampire' } }],
      flags: { gamesystem: 'werewolf', system: 'hunter' }
    }

    expect(resolveMessageSystem(message)).toBe('god')
  })

  it('preserves the original roll mode', () => {
    game.settings = { get: () => 'publicroll' }

    expect(resolveMessageRollMode({ rolls: [{ options: { rollMode: 'blindroll' } }] })).toBe(
      'blindroll'
    )
  })

  it('normalizes context-menu and data-action reroll targets', () => {
    document.body.innerHTML = `<li class="chat-message" data-message-id="message-id">
      <button class="reroll-button"><i class="icon"></i></button>
    </li>`

    const messageElement = document.querySelector('.chat-message')
    const button = document.querySelector('.reroll-button')
    const icon = document.querySelector('.icon')

    expect(resolveRerollMessageElement(messageElement)).toBe(messageElement)
    expect(resolveRerollMessageElement(new Event('click'), button)).toBe(messageElement)
    expect(resolveRerollMessageElement({ target: icon })).toBe(messageElement)
  })

  it('limits selection to three dice within the current dialog', () => {
    document.body.innerHTML = `
      <div id="first-dialog"><div class="reroll">
        <div class="die-select"></div><div class="die-select"></div>
        <div class="die-select"></div><div class="die-select"></div>
      </div></div>
      <div id="second-dialog"><div class="reroll">
        <div class="die-select selected"></div>
      </div></div>`

    const firstDialog = document.querySelector('#first-dialog')
    const container = firstDialog.querySelector('.reroll')
    const dice = container.querySelectorAll('.die-select')

    expect(toggleRerollDie(dice[0], container)).toBe(true)
    expect(toggleRerollDie(dice[1], container)).toBe(true)
    expect(toggleRerollDie(dice[2], container)).toBe(true)
    expect(toggleRerollDie(dice[3], container)).toBe(false)
    expect(getSelectedRerollDice(firstDialog, '.reroll')).toHaveLength(3)
  })

  it('rejects a manipulated selection containing more than three dice', () => {
    document.body.innerHTML = `<div id="dialog"><div class="reroll">
      <div class="die-select selected"></div><div class="die-select selected"></div>
      <div class="die-select selected"></div><div class="die-select selected"></div>
    </div></div>`

    expect(getSelectedRerollDice(document.querySelector('#dialog'), '.reroll')).toEqual([])
  })
})
