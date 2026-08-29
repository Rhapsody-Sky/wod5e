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

  it('keeps the sidebar out of document flow and its icons at a fixed height', () => {
    const stylingPath = path.resolve('display/shared/styling/parts/god-styling.less')
    const styling = fs.readFileSync(stylingPath, 'utf8')

    expect(styling).not.toMatch(/\.window-content\s*\{[\s\S]*?>\s*\*\s*\{[\s\S]*?position:\s*relative/)
    expect(styling).toContain('flex: 0 0 50px;')
    expect(styling).toContain('min-height: 50px;')
    expect(styling).toContain('overflow-y: auto;')
  })
})
