import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  _onSelectGodAttribute,
  buildGodAttributeRollDataset
} from '#system/actor/scripts/god-attribute-roll.js'
import {
  buildRollMenuPool,
  getDivineAttributeOptions,
  isActorCompatibleWithRollSystem,
  resolvePromptActor
} from '#system/applications/roll-menu/roll-menu-pool.js'

const localize = (key) =>
  ({
    'WOD5E.God.AttributeList.aspect': 'Aspect',
    'WOD5E.God.AttributeList.identity': 'Identity',
    'WOD5E.God.AttributeList.insight': 'Insight',
    'WOD5E.God.AttributeList.power': 'Power',
    'WOD5E.God.AttributeList.force': 'Force'
  })[key] || key

afterEach(() => {
  delete globalThis.fromUuid
  delete game.actors
})

describe('God sheet roll flow', () => {
  beforeEach(() => {
    game.i18n.localize = localize
    game.i18n.format = (key, data) => `${key}:${data.attribute}`
    globalThis.WOD5E = {
      api: {
        RollFromDataset: vi.fn()
      }
    }
  })

  it('builds a dedicated single-attribute dataset', () => {
    expect(buildGodAttributeRollDataset(['aspect'], localize)).toEqual({
      label: 'Aspect',
      valuePaths: 'divineattributes.aspect.value',
      selectors: 'divineattributes divineattributes.aspect',
      disableAdvancedDice: true
    })
  })

  it('builds a combined two-attribute dataset without duplicate paths', () => {
    expect(buildGodAttributeRollDataset(['identity', 'power', 'identity'], localize)).toEqual({
      label: 'Identity + Power',
      valuePaths: 'divineattributes.identity.value divineattributes.power.value',
      selectors: 'divineattributes divineattributes.identity divineattributes.power',
      disableAdvancedDice: true
    })
  })

  it('arms the first clicked attribute and rolls when a second is clicked', async () => {
    const element = document.createElement('div')
    element.innerHTML = `
      <div class="god-attribute"><button class="god-attribute-invocation" data-attribute-id="aspect"></button></div>
      <div class="god-attribute"><button class="god-attribute-invocation" data-attribute-id="force"></button></div>
      <p class="god-attribute-selection-status"></p>
    `
    const sheet = {
      actor: {
        system: {
          divineattributes: { aspect: { value: 2 }, force: { value: 3 } }
        }
      },
      element
    }
    const event = { preventDefault: vi.fn(), shiftKey: false }
    const aspectButton = element.querySelector('[data-attribute-id="aspect"]')
    const forceButton = element.querySelector('[data-attribute-id="force"]')

    await _onSelectGodAttribute.call(sheet, event, aspectButton)

    expect(sheet._selectedGodAttributeId).toBe('aspect')
    expect(aspectButton.getAttribute('aria-pressed')).toBe('true')
    expect(WOD5E.api.RollFromDataset).not.toHaveBeenCalled()

    await _onSelectGodAttribute.call(sheet, event, forceButton)

    expect(sheet._selectedGodAttributeId).toBeNull()
    expect(WOD5E.api.RollFromDataset).toHaveBeenCalledWith({
      actor: sheet.actor,
      dataset: {
        label: 'Aspect + Force',
        valuePaths: 'divineattributes.aspect.value divineattributes.force.value',
        selectors: 'divineattributes divineattributes.aspect divineattributes.force',
        disableAdvancedDice: true
      }
    })
  })
})

describe('splat-aware Roll Menu pools', () => {
  it('retains legacy Core skill-and-attribute paths and selectors', () => {
    const pool = buildRollMenuPool(
      {
        dice: {
          skill: 'athletics',
          attribute: 'strength'
        }
      },
      {
        skillOptions: { athletics: { displayName: 'Athletics' } },
        attributeOptions: { strength: { displayName: 'Strength', type: 'physical' } },
        localize
      }
    )

    expect(pool).toMatchObject({
      system: 'core',
      label: 'Athletics + Strength',
      valuePaths: 'skills.athletics.value attributes.strength.value',
      selectors: 'skills skills.athletics attributes attributes.strength physical',
      disableAdvancedDice: false,
      hasDuplicate: false
    })
  })

  it('supports one or two divine attributes in the God Roll Builder', () => {
    const single = buildRollMenuPool(
      { system: 'god', dice: { divineAttribute: 'insight' } },
      { localize }
    )
    const paired = buildRollMenuPool(
      {
        system: 'god',
        dice: { divineAttribute: 'aspect', divineAttribute2: 'force' }
      },
      { localize }
    )

    expect(single).toMatchObject({
      label: 'Insight',
      valuePaths: 'divineattributes.insight.value',
      selectors: 'divineattributes divineattributes.insight',
      disableAdvancedDice: true
    })
    expect(paired).toMatchObject({
      label: 'Aspect + Force',
      valuePaths: 'divineattributes.aspect.value divineattributes.force.value',
      selectors: 'divineattributes divineattributes.aspect divineattributes.force',
      disableAdvancedDice: true
    })
  })

  it('detects duplicate divine attributes and incompatible prompted actors', () => {
    const pool = buildRollMenuPool(
      {
        system: 'god',
        dice: { divineAttribute: 'aspect', divineAttribute2: 'aspect' }
      },
      { localize }
    )

    expect(pool.hasDuplicate).toBe(true)
    expect(isActorCompatibleWithRollSystem({ system: { gamesystem: 'god' } }, 'god')).toBe(true)
    expect(isActorCompatibleWithRollSystem({ system: { gamesystem: 'vampire' } }, 'god')).toBe(
      false
    )
    expect(isActorCompatibleWithRollSystem({}, 'core')).toBe(true)
  })

  it('keeps an empty God pool empty so callers can reject it', () => {
    const pool = buildRollMenuPool({ system: 'god', dice: {} }, { localize })

    expect(pool.valuePaths).toBe('')
    expect(pool.label).toBe('')
  })

  it('resolves an unlinked-token actor through its UUID', async () => {
    const syntheticActor = { documentName: 'Actor', id: 'synthetic-god' }
    globalThis.fromUuid = vi.fn(async () => syntheticActor)

    await expect(resolvePromptActor('base-actor', 'Scene.s.Token.t.Actor.a')).resolves.toBe(
      syntheticActor
    )
  })

  it('falls back to a world actor when a stored UUID is stale', async () => {
    const worldActor = { id: 'world-god' }
    globalThis.fromUuid = vi.fn(async () => {
      throw new Error('Missing scene')
    })
    game.actors = { get: vi.fn(() => worldActor) }
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

    await expect(resolvePromptActor('world-god', 'Scene.missing.Actor.a')).resolves.toBe(worldActor)

    warn.mockRestore()
  })

  it('localizes all five Roll Builder options', () => {
    expect(getDivineAttributeOptions(localize)).toEqual({
      aspect: 'Aspect',
      identity: 'Identity',
      insight: 'Insight',
      power: 'Power',
      force: 'Force'
    })
  })
})
