import { vi, describe, it, expect } from 'vitest'

import { generateRollMessageData } from '#system/scripts/rolls/roll-message.js'
import { mortalBasicSuccess, mortalNoSuccess } from './fixtures/mortal-rolls.js'
import {
  vampireMixedHungerSuccess,
  vampireBasicOnlySuccess,
  vampireHungerOnlyFailure
} from './fixtures/vampire-rolls.js'
import { werewolfMixedRageSuccess, werewolfBasicOnlySuccess } from './fixtures/werewolf-rolls.js'
import { hunterMixedDesperationSuccess, hunterBasicOnlySuccess } from './fixtures/hunter-rolls.js'
import { godAllSymbolFaces, godBasicSuccess } from './fixtures/god-rolls.js'

vi.mock('#system/scripts/system-rolls.js', () => {
  return {
    WOD5eRoll: class {
      constructor(data) {
        Object.assign(this, data)
      }

      static fromJSON(data) {
        return new this(data)
      }
    }
  }
})

/**
 * Mortal Rolls
 */
describe('generateRollMessage - Mortal', () => {
  it('calculates total result correctly for a basic mortal success', async () => {
    const result = await generateRollMessageData({
      roll: mortalBasicSuccess,
      title: 'Mortal Test Roll'
    })

    expect(result.totalResult).toBe(2)
    expect(result.labelData.labelText).toBe('2 WOD5E.RollList.Successes')
  })

  it('handles a mortal roll with zero successes', async () => {
    const result = await generateRollMessageData({
      roll: mortalNoSuccess,
      title: 'Mortal Failure'
    })

    expect(result.totalResult).toBe(0)
    expect(result.labelData.labelText).toBe('WOD5E.RollList.Fail')
  })
})

/**
 * Vampire Rolls
 */
describe('generateRollMessage - Vampire', () => {
  it('handles vampire rolls with only basic dice', async () => {
    const result = await generateRollMessageData({
      roll: vampireBasicOnlySuccess,
      system: 'vampire',
      title: 'Stealth Roll'
    })

    expect(result.totalResult).toBeGreaterThan(0)
    expect(result.advancedDice).toBeNull
    expect(result.labelData.labelText).toBe('1 WOD5E.RollList.Success')
  })

  it('handles mixed vampire + hunger dice success', async () => {
    const result = await generateRollMessageData({
      roll: vampireMixedHungerSuccess,
      system: 'vampire',
      title: 'Feeding Roll'
    })

    expect(result.totalResult).toBe(2)
    expect(result.labelData.labelText).toBe('2 WOD5E.RollList.Successes')
  })

  it('handles hunger dice with no successes', async () => {
    const result = await generateRollMessageData({
      roll: vampireHungerOnlyFailure,
      system: 'vampire',
      title: 'Starving Roll'
    })

    expect(result.totalResult).toBe(0)
    expect(result.labelData.labelText).toBe('WOD5E.VTM.PossibleBestialFailure')
  })
})

/**
 * Werewolf Rolls
 */
describe('generateRollMessage - Werewolf', () => {
  it('handles werewolf rolls with only basic dice', async () => {
    const result = await generateRollMessageData({
      roll: werewolfBasicOnlySuccess,
      system: 'werewolf',
      title: 'Tracking Roll'
    })

    expect(result.totalResult).toBeGreaterThan(0)
    expect(result.advancedDice).toBeNull()
    expect(result.labelData.labelText).toBe('2 WOD5E.RollList.Successes')
  })

  it('handles mixed werewolf + rage dice success', async () => {
    const result = await generateRollMessageData({
      roll: werewolfMixedRageSuccess,
      system: 'werewolf',
      title: 'Frenzy Roll'
    })

    expect(result.totalResult).toBeGreaterThan(0)
    expect(result.labelData.labelText).toBe('2 WOD5E.RollList.Successes')
  })
})

/**
 * Hunter Rolls
 */
describe('generateRollMessage - Hunter', () => {
  it('handles hunter rolls with only basic dice', async () => {
    const result = await generateRollMessageData({
      roll: hunterBasicOnlySuccess,
      system: 'hunter',
      title: 'Prepared Shot'
    })

    expect(result.totalResult).toBeGreaterThan(0)
    expect(result.advancedDice).toBeNull()
    expect(result.labelData.labelText).toBe('2 WOD5E.RollList.Successes')
  })

  it('handles mixed hunter + desperation dice success', async () => {
    const result = await generateRollMessageData({
      roll: hunterMixedDesperationSuccess,
      system: 'hunter',
      title: 'Last Stand'
    })

    expect(result.totalResult).toBeGreaterThan(0)
    expect(result.labelData.labelText).toBe('2 WOD5E.RollList.Successes')
  })
})

/**
 * God Rolls
 */
describe('generateRollMessage - God', () => {
  it('uses God dice icons for a divine-attribute roll', async () => {
    const result = await generateRollMessageData({
      roll: godBasicSuccess,
      system: 'god',
      title: 'Aspekt + Macht'
    })

    expect(result.totalResult).toBe(2)
    expect(result.basicDice.results[0].img).toContain('/dice/god/aspect.png')
    expect(result.basicDice.results[1].img).toContain('/dice/god/force.png')
    expect(result.basicDice.results[0].classes).toContain('god-dice')
    expect(result.labelData.labelText).toBe('2 WOD5E.RollList.Successes')
  })

  it('keeps 1-5 blank and maps a distinct symbol to every success face from 6-10', async () => {
    const result = await generateRollMessageData({
      roll: godAllSymbolFaces,
      system: 'god',
      title: 'Divine symbols'
    })

    const images = result.basicDice.results.map((die) => die.img)
    expect(images).toEqual([
      'systems/wod5e/assets/icons/dice/god/failure.png',
      'systems/wod5e/assets/icons/dice/god/aspect.png',
      'systems/wod5e/assets/icons/dice/god/identity.png',
      'systems/wod5e/assets/icons/dice/god/insight.png',
      'systems/wod5e/assets/icons/dice/god/force.png',
      'systems/wod5e/assets/icons/dice/god/power.png'
    ])
  })
})
