import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { SYSTEM_ID } from '#system/constants.js'
import { _onPromptInChat } from '#system/applications/roll-menu/scripts/on-prompt-in-chat.js'
import { _onRollFromMenu } from '#system/applications/roll-menu/scripts/on-roll-from-menu.js'
import { processRollPrompt } from '#system/ui/message-logic/roll-prompt.js'

const legacyRoll = {
  name: 'Old saved roll',
  difficulty: 2,
  dice: { skill: 'athletics', attribute: 'strength' }
}
const godRoll = {
  name: 'Divine test',
  system: 'god',
  dice: { divineAttribute: 'power', divineAttribute2: 'insight' }
}
const god = {
  id: 'god',
  uuid: 'Scene.test.Token.divine.Actor.god',
  isOwner: true,
  visible: true,
  system: { gamesystem: 'god' }
}
const vampire = {
  id: 'vampire',
  uuid: 'Actor.vampire',
  system: { gamesystem: 'vampire' }
}

beforeEach(() => {
  vi.stubGlobal('game', {
    ...game,
    users: {
      current: {
        flags: { wod5e: { rollMenuActiveRoll: 'saved', rollMenuSavedRolls: { saved: legacyRoll } } }
      }
    },
    actors: new Map([['god', { id: 'god', system: { gamesystem: 'god' } }]]),
    scenes: new Map([['test', { tokens: new Map([['divine', { actor: god }]]) }]])
  })
  vi.stubGlobal('ChatMessage', {
    getSpeaker: () => ({ actor: 'god', scene: 'test', token: 'divine' })
  })
  vi.stubGlobal('canvas', {
    tokens: { controlled: [{ actor: god }, { actor: vampire }, { actor: null }] }
  })
  vi.stubGlobal('foundry', {
    ...foundry,
    documents: { ChatMessage: { implementation: { create: vi.fn() } } }
  })
  vi.stubGlobal('WOD5E', {
    Skills: { getList: () => ({ athletics: { displayName: 'Athletics' } }) },
    Attributes: { getList: () => ({ strength: { displayName: 'Strength', type: 'physical' } }) },
    api: { RollFromDataset: vi.fn() }
  })
  vi.stubGlobal('ui', { notifications: { warn: vi.fn() } })
})

afterEach(() => vi.unstubAllGlobals())

describe('Roll Menu in the renamed fork', () => {
  it('reads old saved rolls and uses the actual unlinked-token actor', async () => {
    await _onRollFromMenu({}, document.createElement('button'))

    expect(WOD5E.api.RollFromDataset).toHaveBeenCalledWith({
      actor: god,
      dataset: {
        label: 'Old saved roll',
        valuePaths: 'skills.athletics.value attributes.strength.value',
        selectors: 'skills skills.athletics attributes attributes.strength physical',
        disableAdvancedDice: false,
        difficulty: 2
      }
    })
  })

  it('stores God prompts under the fork ID without embedding actor data', async () => {
    game.users.current.flags.wod5e.rollMenuSavedRolls.saved = godRoll
    await _onPromptInChat({}, document.createElement('button'))
    const create = foundry.documents.ChatMessage.implementation.create
    const { flags } = create.mock.calls[0][0]

    expect(Object.keys(flags)).toEqual([SYSTEM_ID])
    expect(flags[SYSTEM_ID]).toMatchObject({
      valuePaths: 'divineattributes.power.value divineattributes.insight.value',
      selectors: 'divineattributes divineattributes.power divineattributes.insight',
      disableAdvancedDice: true,
      rollSystem: 'god',
      promptedRolls: {
        god: { actorUuid: god.uuid, rolled: false, isCompatible: true },
        vampire: { actorUuid: vampire.uuid, rolled: false, isCompatible: false }
      }
    })
    expect(flags[SYSTEM_ID].promptedRolls.god).not.toHaveProperty('actor')
  })

  it('warns cleanly when a saved roll does not exist', async () => {
    game.users.current.flags = {}
    await _onRollFromMenu({}, document.createElement('button'))
    await _onPromptInChat({}, document.createElement('button'))

    expect(ui.notifications.warn).toHaveBeenCalledTimes(2)
    expect(WOD5E.api.RollFromDataset).not.toHaveBeenCalled()
    expect(foundry.documents.ChatMessage.implementation.create).not.toHaveBeenCalled()
  })

  it('resolves prompted actors for display without mutating stored flags', async () => {
    vi.stubGlobal(
      'fromUuid',
      vi.fn(async () => ({ actor: god }))
    )
    const stored = Object.freeze({
      god: Object.freeze({ actorUuid: god.uuid, rolled: false, isCompatible: true })
    })
    const context = { messageData: { promptedRolls: stored } }

    await processRollPrompt(context)

    expect(context.messageData.promptedRolls.god).toMatchObject({
      actor: god,
      isVisible: true,
      canRoll: true
    })
    expect(stored.god).not.toHaveProperty('actor')
    expect(stored.god).not.toHaveProperty('canRoll')
  })
})
