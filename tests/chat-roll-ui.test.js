import fs from 'node:fs'
import path from 'node:path'

import Handlebars from 'handlebars'
import { describe, expect, it } from 'vitest'

import { SYSTEM_ID } from '#system/constants.js'

function renderRollPrompt(context) {
  const hbs = Handlebars.create()
  hbs.registerHelper('localize', (key) => key)
  hbs.registerHelper('ifgr', function (left, right, options) {
    return left > right ? options.fn(this) : options.inverse(this)
  })
  hbs.registerPartial(`systems/${SYSTEM_ID}/display/ui/chat/chat-message-header.hbs`, '')
  const render = hbs.compile(
    fs.readFileSync('display/ui/chat/chat-message-roll-prompt.hbs', 'utf8')
  )
  const template = document.createElement('template')
  template.innerHTML = render(context)
  return template.content
}

describe('Chat roll presentation', () => {
  it('marks standard and extended rolls with their splat class', () => {
    const standard = fs.readFileSync(path.resolve('display/ui/chat/chat-message-roll.hbs'), 'utf8')
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

  it('renders divine selectors from the renamed fork flags', () => {
    const selectors = 'divineattributes divineattributes.power'
    const prompt = renderRollPrompt({
      message: { flags: { [SYSTEM_ID]: { selectors, disableAdvancedDice: true } } },
      valuePaths: 'divineattributes.power.value',
      promptedRolls: {
        god: { isVisible: true, canRoll: true, actorUuid: 'Actor.god', actor: { name: 'God' } }
      }
    })
    const button = prompt.querySelector('[data-action="rollFromChat"]')

    expect(button.dataset.selectors).toBe(selectors)
    expect(button.dataset.disableAdvancedDice).toBe('true')
    expect(button.dataset.actorUuid).toBe('Actor.god')
  })

  it('does not print a private prompted roll total or outcome', () => {
    const prompt = renderRollPrompt({
      promptedRolls: {
        god: {
          rolled: true,
          rollData: {
            isContentVisible: false,
            difficulty: 3,
            totalResult: 987,
            resultText: 'Secret result'
          }
        }
      }
    })

    expect(prompt.textContent).toContain('WOD5E.Chat.ActorResultsHidden')
    expect(prompt.textContent).not.toContain('987')
    expect(prompt.textContent).not.toContain('Secret result')
  })
})
