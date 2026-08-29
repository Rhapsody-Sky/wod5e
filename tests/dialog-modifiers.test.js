import { beforeEach, describe, expect, it } from 'vitest'

import { getSituationalModifierTarget } from '#system/scripts/rolls/dialog-modifiers.js'

describe('getSituationalModifierTarget', () => {
  beforeEach(() => {
    foundry.utils = {
      getProperty: (object, path) => path.split('.').reduce((value, key) => value?.[key], object)
    }
  })

  it('adds a positive modifier to advanced dice until Hunger is reached', () => {
    expect(
      getSituationalModifierTarget({
        modifier: 2,
        basicValue: 4,
        advancedValue: 2,
        disableAdvancedDice: false,
        systemData: {
          usesResourceOnAdvancedDice: true,
          resourceValuePath: 'hunger.value'
        },
        actor: { system: { hunger: { value: 4 } } }
      })
    ).toEqual({ applyDiceTo: 'advanced', checkValue: 4 })
  })

  it('keeps a positive modifier on basic dice once Hunger is reached', () => {
    expect(
      getSituationalModifierTarget({
        modifier: 2,
        basicValue: 4,
        advancedValue: 4,
        disableAdvancedDice: false,
        systemData: {
          usesResourceOnAdvancedDice: true,
          resourceValuePath: 'hunger.value'
        },
        actor: { system: { hunger: { value: 4 } } }
      })
    ).toEqual({ applyDiceTo: 'basic', checkValue: 4 })
  })
})
