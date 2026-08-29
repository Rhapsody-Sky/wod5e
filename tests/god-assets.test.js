import fs from 'node:fs'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

describe('God roll assets', () => {
  it('ships the roll dialog selected by the God roll pipeline', () => {
    const dialogPath = path.resolve('display/ui/god-roll-dialog.hbs')

    expect(fs.existsSync(dialogPath)).toBe(true)
    expect(fs.readFileSync(dialogPath, 'utf8')).toContain('id="inputBasicDice"')
  })

  it('makes every divine attribute directly rollable', () => {
    const statsPath = path.resolve('display/shared/actors/parts/god/stats.hbs')
    const statsTemplate = fs.readFileSync(statsPath, 'utf8')

    expect(statsTemplate).toContain('class="god-attribute-invocation rollable"')
    expect(statsTemplate).toContain('data-action="roll"')
    expect(statsTemplate).toContain('data-value-paths="divineattributes.{{attribute.id}}.value"')
    expect(statsTemplate).toContain('data-disable-advanced-dice="true"')
  })
})
