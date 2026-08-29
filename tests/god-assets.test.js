import fs from 'node:fs'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

describe('God roll assets', () => {
  it('ships the roll dialog selected by the God roll pipeline', () => {
    const dialogPath = path.resolve('display/ui/god-roll-dialog.hbs')

    expect(fs.existsSync(dialogPath)).toBe(true)
    expect(fs.readFileSync(dialogPath, 'utf8')).toContain('id="inputBasicDice"')
  })
})
