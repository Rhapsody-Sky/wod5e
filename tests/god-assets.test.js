import fs from 'node:fs'
import path from 'node:path'

import Handlebars from 'handlebars'
import { describe, expect, it, vi } from 'vitest'

import { GodActorSheet } from '#system/actor/god-actor-sheet.js'
import { SYSTEM_ID } from '#system/constants.js'

vi.mock('#system/actor/spc-actor-sheet.js', () => ({
  SPCActorSheet: class {
    _preparePartContext(_partId, context) {
      return context
    }
  }
}))

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

  it('renders the new card order without changing attribute values or roll targets', async () => {
    const values = { aspect: 1, identity: 2, insight: 3, power: 4, force: 5 }
    const sheet = new GodActorSheet()
    sheet.actor = {
      system: {
        divineattributes: Object.fromEntries(
          Object.entries(values).map(([id, value]) => [id, { value }])
        )
      }
    }
    const context = await sheet._preparePartContext('stats', { locked: false }, {})
    const handlebars = Handlebars.create()
    handlebars.registerHelper('localize', (key) => key)
    for (const partial of ['exceptional-dice-pools', 'spc-traits', 'spc-conditions']) {
      handlebars.registerPartial(
        `systems/${SYSTEM_ID}/display/shared/actors/parts/spc/${partial}.hbs`,
        ''
      )
    }
    const render = handlebars.compile(
      fs.readFileSync('display/shared/actors/parts/god/stats.hbs', 'utf8')
    )
    const template = document.createElement('template')
    template.innerHTML = render(context)
    const cards = Array.from(
      template.content.querySelectorAll('.god-attribute-list > .god-attribute')
    )
    const order = ['aspect', 'identity', 'power', 'force', 'insight']

    expect(cards.map((card) => card.querySelector('button').dataset.valuePaths)).toEqual(
      order.map((id) => `divineattributes.${id}.value`)
    )
    expect(
      cards.map((card) => {
        const input = card.querySelector('input')
        return [input.name, Number(input.value)]
      })
    ).toEqual(order.map((id) => [`system.divineattributes.${id}.value`, values[id]]))
  })

  it('keeps the 3D God symbols inside the tapered d10 face', () => {
    const dicePath = path.resolve('system/dice/dice-so-nice.js')
    const diceConfig = fs.readFileSync(dicePath, 'utf8')

    expect(diceConfig).toMatch(/(?:'do'|\bdo):\s*0\.56/)
    expect(diceConfig).toContain('god-aspect-dsn.png')
    expect(diceConfig).toContain('god-force-dsn.png')
  })

  it('keeps the sidebar out of document flow and its icons at a fixed height', () => {
    const stylingPath = path.resolve('display/shared/styling/parts/god-styling.less')
    const styling = fs.readFileSync(stylingPath, 'utf8')

    expect(styling).not.toMatch(
      /\.window-content\s*\{[\s\S]*?>\s*\*\s*\{[\s\S]*?position:\s*relative/
    )
    expect(styling).toContain('flex: 0 0 50px;')
    expect(styling).toContain('min-height: 50px;')
    expect(styling).toContain('overflow-y: auto;')
    expect(styling).toContain('padding-bottom: 38px;')
    expect(styling).toContain('min-height: 255px;')
    expect(styling).toContain('bottom: 2px;')
  })

  it('ships a splat-aware shared actor-sheet design language', () => {
    const stylingPath = path.resolve('display/shared/styling/parts/actor-ui-polish.less')
    const styling = fs.readFileSync(stylingPath, 'utf8')

    expect(styling).toContain('.actor.sheet')
    expect(styling).toContain('&.vampire')
    expect(styling).toContain('&.werewolf')
    expect(styling).toContain('&.hunter')
    expect(styling).toContain('&.god')
    expect(styling).toContain('.blood-potency')
    expect(styling).toContain('.balance-trackers')
    expect(styling).toContain('.powers-display-tree')
    expect(styling).toContain('.standard-pools-list')
    expect(styling).toContain('.group-member')
    expect(styling).toContain('.tab[data-tab="experience"]')
    expect(styling).toContain('.note-container')
    expect(styling).toContain('.tab[data-tab="settings"] .form-group')
    expect(styling).toContain('.theme-dark .actor.sheet')
  })
})
