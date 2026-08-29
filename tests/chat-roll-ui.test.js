import fs from 'node:fs'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

describe('Chat roll presentation', () => {
  it('marks standard and extended rolls with their splat class', () => {
    const standard = fs.readFileSync(
      path.resolve('display/ui/chat/chat-message-roll.hbs'),
      'utf8'
    )
    const extended = fs.readFileSync(
      path.resolve('display/ui/chat/chat-message-extended-roll.hbs'),
      'utf8'
    )

    expect(standard).toContain('roll-card roll-card--{{system}}')
    expect(extended).toContain('roll-card roll-card--{{system}}')
  })

  it('styles dice, totals, outcomes and every supported splat', () => {
    const styling = fs.readFileSync(path.resolve('display/ui/styling/chat.less'), 'utf8')

    expect(styling).toContain('.chat-message.message .message-content .roll-card')
    expect(styling).toContain('&.roll-card--vampire')
    expect(styling).toContain('&.roll-card--werewolf')
    expect(styling).toContain('&.roll-card--hunter')
    expect(styling).toContain('&.roll-card--god')
    expect(styling).toContain('.dice-icons')
    expect(styling).toContain('.total-and-difficulty')
    expect(styling).toContain('.roll-result-label.critical-success')
  })
})
