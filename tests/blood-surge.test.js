import { describe, expect, it } from 'vitest'

import { canActorBloodSurge } from '#system/api/blood-surge.js'

function vampire({ type = 'vampire', value = 0, max = 5 } = {}) {
  return {
    type,
    system: {
      gamesystem: 'vampire',
      hunger: { value, max }
    }
  }
}

describe('canActorBloodSurge', () => {
  it('allows Blood Surge below maximum Hunger', () => {
    expect(canActorBloodSurge(vampire({ value: 4, max: 5 }))).toBe(true)
  })

  it('disallows Blood Surge at maximum Hunger', () => {
    expect(canActorBloodSurge(vampire({ value: 5, max: 5 }))).toBe(false)
  })

  it('disallows Blood Surge for ghouls', () => {
    expect(canActorBloodSurge(vampire({ type: 'ghoul', value: 0, max: 5 }))).toBe(false)
  })
})
