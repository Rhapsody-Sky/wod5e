import { describe, expect, it } from 'vitest'

import { syncActorGamesystemClass } from '../system/actor/scripts/sheet-classes.js'

describe('SPC actor sheet gamesystem class', () => {
  it('keeps God sheets God-only across repeated renders', () => {
    const element = document.createElement('section')
    element.classList.add('wod5e', 'spc', 'mortal', 'god')

    syncActorGamesystemClass(element, 'god')
    syncActorGamesystemClass(element, 'god')

    expect(element.classList.contains('god')).toBe(true)
    expect(element.classList.contains('mortal')).toBe(false)
    expect([...element.classList].filter((className) => className === 'god')).toHaveLength(1)
  })

  it('falls back to mortal and removes stale splat classes', () => {
    const element = document.createElement('section')
    element.classList.add('vampire', 'hunter')

    syncActorGamesystemClass(element, 'unknown')

    expect([...element.classList]).toEqual(['mortal'])
  })
})
