import { describe, expect, it } from 'vitest'

import { getActorDisciplineOptions } from '#system/api/actor-discipline-options.js'

const definitions = {
  animalism: { displayName: 'Animalism' },
  auspex: { displayName: 'Auspex' },
  celerity: { displayName: 'Celerity' },
  dominate: { displayName: 'Dominate' },
  presence: { displayName: 'Presence' }
}

describe('getActorDisciplineOptions', () => {
  it('only returns disciplines present on the actor sheet', () => {
    const actor = {
      system: {
        disciplines: {
          animalism: { visible: true, value: 1, powers: [] },
          auspex: { visible: false, value: 0, powers: [] },
          celerity: { visible: true, value: 2, powers: [] }
        }
      }
    }

    expect(Object.keys(getActorDisciplineOptions(definitions, actor))).toEqual([
      'animalism',
      'celerity'
    ])
  })

  it('keeps legacy disciplines with dots or powers', () => {
    const actor = {
      system: {
        disciplines: {
          auspex: { visible: false, value: 2, powers: [] },
          dominate: { visible: false, value: 0, powers: [{ id: 'command' }] }
        }
      }
    }

    expect(Object.keys(getActorDisciplineOptions(definitions, actor))).toEqual([
      'auspex',
      'dominate'
    ])
  })

  it('retains an explicitly preselected discipline', () => {
    const actor = { system: { disciplines: {} } }

    expect(Object.keys(getActorDisciplineOptions(definitions, actor, 'presence'))).toEqual([
      'presence'
    ])
  })
})
