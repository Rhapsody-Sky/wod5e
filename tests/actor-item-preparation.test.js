import { describe, expect, it, vi } from 'vitest'

import {
  collectItemModifiers,
  enrichItemDescriptions
} from '../system/actor/scripts/prepare-items.js'

describe('actor item preparation', () => {
  it('collects modifiers without requiring a sheet render', () => {
    const firstBonus = { value: 1, paths: ['all'] }
    const secondBonus = { value: 2, paths: ['skills'] }
    const items = [
      { system: { bonuses: [firstBonus] } },
      { system: { bonuses: [{ value: 99 }], suppressed: true } },
      { system: { bonuses: [secondBonus] } },
      { system: {} }
    ]

    expect(collectItemModifiers(items)).toEqual([firstBonus, secondBonus])
    expect(collectItemModifiers(items)).toEqual([firstBonus, secondBonus])
  })

  it('supports Foundry-style keyed item collections', () => {
    const bonus = { value: 1, paths: ['all'] }
    const items = new Map([['item-id', { system: { bonuses: [bonus] } }]])

    expect(collectItemModifiers(items)).toEqual([bonus])
  })

  it('waits for all item descriptions to be enriched', async () => {
    const enrichHTML = vi
      .spyOn(foundry.applications.ux.TextEditor.implementation, 'enrichHTML')
      .mockImplementation(async (description) => `<p>${description}</p>`)
    const items = [
      { system: { description: 'First' } },
      { system: { description: '' } },
      { system: { description: 'Second' } }
    ]

    await enrichItemDescriptions(items)

    expect(enrichHTML).toHaveBeenCalledTimes(2)
    expect(items[0].system.enrichedDescription).toBe('<p>First</p>')
    expect(items[1].system.enrichedDescription).toBeUndefined()
    expect(items[2].system.enrichedDescription).toBe('<p>Second</p>')

    enrichHTML.mockRestore()
  })
})
