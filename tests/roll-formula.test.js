import { describe, expect, it } from 'vitest'

import { generateRollFormula } from '#system/scripts/rolls/roll-formula.js'

describe('generateRollFormula - God', () => {
  it('uses the dedicated God die denomination without advanced dice', async () => {
    const formula = await generateRollFormula({
      basicDice: 7,
      advancedDice: 0,
      system: 'god'
    })

    expect(formula).toBe('7docs>5')
  })
})
