import { describe, expect, it, vi } from 'vitest'

import { _onExpandRollDetails, getRollActionState } from '#system/ui/message-logic/roll-actions.js'

describe('getRollActionState', () => {
  it('offers visible details and both reroll actions to the message owner', () => {
    expect(
      getRollActionState({
        basicDice: { results: [{ classes: 'die roll-img rerollable' }] },
        advancedDice: null,
        canManage: true,
        isContentVisible: true
      })
    ).toEqual({
      canViewRollDetails: true,
      canAnyReroll: true,
      canWillpowerReroll: true
    })
  })

  it('does not offer rerolls after a die has already been rerolled', () => {
    const state = getRollActionState({
      basicDice: { results: [{ classes: 'die rerollable rerolled', discarded: true }] },
      canManage: true
    })

    expect(state.canViewRollDetails).toBe(true)
    expect(state.canAnyReroll).toBe(false)
    expect(state.canWillpowerReroll).toBe(false)
  })

  it('does not expose private results or rerolls to unauthorized viewers', () => {
    expect(
      getRollActionState({
        basicDice: { results: [{ classes: ['die', 'rerollable'] }] },
        canManage: false,
        isContentVisible: false
      })
    ).toEqual({
      canViewRollDetails: false,
      canAnyReroll: false,
      canWillpowerReroll: false
    })
  })

  it('forwards the details button to the native roll container', () => {
    const container = document.createElement('div')
    container.className = 'dice-roll'
    container.dataset.action = 'expandRoll'
    const details = document.createElement('button')
    container.append(details)
    const onClick = vi.fn()
    container.addEventListener('click', onClick)
    const event = { preventDefault: vi.fn() }

    _onExpandRollDetails(event, details)

    expect(event.preventDefault).toHaveBeenCalledOnce()
    expect(onClick).toHaveBeenCalledOnce()
    expect(onClick.mock.calls[0][0].target).toBe(container)
  })
})
