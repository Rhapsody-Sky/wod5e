import { beforeEach, describe, expect, it, vi } from 'vitest'

import { SYSTEM_ID } from '../system/constants.js'
import { applyAutomationToggle } from '../system/scripts/automation-settings.js'
import {
  getSystemFlag,
  getSystemFlags,
  getSystemSetting
} from '../system/scripts/fork-compatibility.js'
import {
  migrateForkReferences,
  rewriteForkString
} from '../system/scripts/migration/fork-references.js'
import {
  buildForkDocumentUpdate,
  migrateForkIdentity,
  restoreForkClientSettings,
  restoreForkSettings
} from '../system/scripts/migration/migrate-fork-identity.js'
import { needsLegacyDataMigration } from '../system/scripts/migration/migration-state.js'

function settingsFixture(values = {}) {
  const stored = new Map(
    Object.entries(values).map(([key, value]) => [key, { key, value, user: null }])
  )
  const client = new Map()
  const configs = new Map()
  const settings = {
    settings: configs,
    storage: new Map([
      ['world', stored],
      [
        'client',
        {
          getItem: (key) => client.get(key) ?? null,
          setItem: (key, value) => client.set(key, value)
        }
      ]
    ]),
    get: vi.fn(
      (scope, key) =>
        stored.get(`${scope}.${key}`)?.value ?? configs.get(`${scope}.${key}`)?.default
    ),
    set: vi.fn(async (scope, key, value) => {
      await Promise.resolve()
      stored.set(`${scope}.${key}`, { key: `${scope}.${key}`, value, user: null })
      await configs.get(`${scope}.${key}`)?.onChange?.(value)
      return value
    })
  }
  const register = (key, { scope = 'world', default: initial = null, ...config } = {}) =>
    configs.set(`${SYSTEM_ID}.${key}`, {
      key,
      namespace: SYSTEM_ID,
      scope,
      default: initial,
      ...config
    })
  for (const [key, initial] of Object.entries({
    forkIdentityMigrationVersion: 0,
    worldVersion: '1.5',
    dataSchemaVersion: 0
  }))
    register(key, { default: initial })
  return { settings, stored, client, register }
}

class TestDocument {
  static hierarchy = {}
  constructor(source) {
    this.source = source
    this.update = vi.fn(async (changes) => {
      this.source = { ...this.source, ...changes }
    })
  }
  toObject() {
    return structuredClone(this.source)
  }
  *traverseEmbeddedDocuments() {}
}

let fixture
beforeEach(() => {
  fixture = settingsFixture()
  vi.stubGlobal('game', {
    user: { id: 'gm', isGM: true },
    userId: 'gm',
    users: { activeGM: { id: 'gm' } },
    settings: fixture.settings,
    collections: new Map(),
    packs: []
  })
  vi.stubGlobal('ui', { notifications: { info: vi.fn() } })
})

describe('Fork namespace reads', () => {
  it('reads inactive flag namespaces without calling Document.getFlag', () => {
    const document = {
      flags: { wod5e: { rollMenuSavedRolls: [1], enabled: false } },
      getFlag: () => {
        throw Error('Inactive scope')
      }
    }
    expect(getSystemFlag(document, 'rollMenuSavedRolls')).toEqual([1])
    expect(getSystemFlag(document, 'enabled')).toBe(false)
  })

  it('merges legacy fields but preserves all explicit destination values', () => {
    const flags = {
      vtm5e: { nested: { older: 1 } },
      wod5e: { nested: { original: 2 }, bool: true, list: [1], text: 'old', number: 8 },
      [SYSTEM_ID]: { nested: { original: 3 }, bool: false, list: [], text: '', number: 0 }
    }
    expect(getSystemFlags({ flags })).toEqual({
      nested: { older: 1, original: 3 },
      bool: false,
      list: [],
      text: '',
      number: 0
    })
  })

  it('does not resurrect a deleted migrated flag from retained legacy data', () => {
    const migrated = migrateForkReferences({ flags: { wod5e: { saved: 'old' } } })
    delete migrated.flags[SYSTEM_ID].saved
    expect(getSystemFlag(migrated, 'saved')).toBeUndefined()
    expect(migrateForkReferences(migrated).flags[SYSTEM_ID].saved).toBeUndefined()
  })

  it('uses old world settings before ready and honors explicit false at destination', () => {
    fixture.register('automatedHunger', { default: true })
    fixture.stored.set('wod5e.automatedHunger', { key: 'wod5e.automatedHunger', value: false })
    expect(getSystemSetting('automatedHunger')).toBe(false)
    fixture.stored.set(`${SYSTEM_ID}.automatedHunger`, {
      key: `${SYSTEM_ID}.automatedHunger`,
      value: true
    })
    expect(getSystemSetting('automatedHunger')).toBe(true)
  })

  it('copies per-browser preferences without deleting or overwriting', () => {
    fixture.register('actorBanner', { scope: 'client', default: true })
    fixture.register('disableVampireFont', { scope: 'client', default: false })
    fixture.client.set('wod5e.actorBanner', 'false')
    fixture.client.set('wod5e.disableVampireFont', 'true')
    fixture.client.set(`${SYSTEM_ID}.disableVampireFont`, 'false')
    restoreForkClientSettings()
    expect(fixture.client.get(`${SYSTEM_ID}.actorBanner`)).toBe('false')
    expect(fixture.client.get(`${SYSTEM_ID}.disableVampireFont`)).toBe('false')
    expect(fixture.client.get('wod5e.actorBanner')).toBe('false')
  })
})

describe('Reference migration', () => {
  it.each([
    ['systems/wod5e/assets/a.png', 'systems/wod5e-gods/assets/a.png'],
    ['/systems/vtm5e/assets/a.png', '/systems/wod5e-gods/assets/a.png'],
    ['<img src="systems/wod5e/assets/a.png">', '<img src="systems/wod5e-gods/assets/a.png">'],
    [
      '@UUID[Compendium.wod5e.conditions.Item.abc]',
      '@UUID[Compendium.wod5e-gods.conditions.Item.abc]'
    ],
    ['wod5e.macros', 'wod5e-gods.macros'],
    ['wod5e.GodActorSheet', 'wod5e-gods.GodActorSheet'],
    ["game.settings.get('wod5e', 'actorBanner')", "game.settings.get('wod5e-gods', 'actorBanner')"],
    ['WOD5E.api.Roll()', 'WOD5E.api.Roll()'],
    ['https://example.com/systems/wod5e/foo.png', 'https://example.com/systems/wod5e/foo.png'],
    ['@UUID[Compendium.third-party.gods.Item.abc]', '@UUID[Compendium.third-party.gods.Item.abc]']
  ])('rewrites only intended references: %s', (old, expected) =>
    expect(rewriteForkString(old)).toBe(expected)
  )

  it('preserves IDs, health, attributes, ownership, history and original legacy flags', () => {
    const original = {
      _id: 'actor-id',
      name: 'Test Deity',
      type: 'god',
      ownership: { player: 3 },
      _stats: { systemId: 'wod5e', systemVersion: '5.3.27-gods.7' },
      img: 'systems/wod5e/assets/icons/god/identity.png',
      system: { health: { value: 5 }, divineattributes: { aspect: { value: 8 } } },
      flags: {
        wod5e: { manualDefaultOwnership: true, img: 'systems/wod5e/avatar.png' },
        core: { sheetClass: 'wod5e.GodActorSheet' }
      },
      items: [{ _id: 'item-id', flags: { wod5e: { dataItemId: 'same-item' } } }]
    }
    const snapshot = structuredClone(original)
    const migrated = migrateForkReferences(original)
    expect(original).toEqual(snapshot)
    expect(migrated.system).toEqual(original.system)
    expect(migrated.ownership).toEqual(original.ownership)
    expect(migrated._stats).toEqual(original._stats)
    expect(migrated._id).toBe(original._id)
    expect(migrated.flags.wod5e).toEqual(original.flags.wod5e)
    expect(migrated.flags[SYSTEM_ID].img).toBe('systems/wod5e-gods/avatar.png')
    expect(migrated.items[0]._id).toBe('item-id')
    expect(migrated.items[0].flags[SYSTEM_ID].dataItemId).toBe('same-item')
    expect(migrateForkReferences(migrated)).toEqual(migrated)
  })

  it('adapts unlinked-token deltas and preserves explicit compendium source choices', () => {
    const result = migrateForkReferences({
      delta: { items: [{ _id: 'i', img: 'systems/wod5e/a.png' }] },
      flags: {
        wod5e: {
          compendiumBrowser: {
            sources: { 'wod5e.conditions': true, 'wod5e-gods.conditions': false }
          }
        }
      }
    })
    expect(result.delta.items[0]).toEqual({ _id: 'i', img: 'systems/wod5e-gods/a.png' })
    expect(result.flags[SYSTEM_ID].compendiumBrowser.sources).toEqual({
      'wod5e-gods.conditions': false
    })
  })
})

describe('Awaited migration runner', () => {
  it('does not launch delayed automation writes while copying the master setting', async () => {
    fixture.register('disableAutomation', { default: false, onChange: applyAutomationToggle })
    for (const key of [
      'automatedWillpower',
      'automatedHunger',
      'automatedOblivion',
      'automatedRage'
    ]) {
      fixture.register(key, { default: true })
      fixture.stored.set(`wod5e.${key}`, { key: `wod5e.${key}`, value: true })
    }
    fixture.stored.set('wod5e.disableAutomation', { key: 'wod5e.disableAutomation', value: true })
    // Model Foundry's unawaited callback, not the fixture's usual awaited one.
    fixture.settings.set.mockImplementation(async (scope, key, value) => {
      fixture.stored.set(`${scope}.${key}`, { key: `${scope}.${key}`, value, user: null })
      void fixture.settings.settings.get(`${scope}.${key}`)?.onChange?.(value)
      return value
    })
    await restoreForkSettings()
    await Promise.resolve()
    expect(
      game.settings.set.mock.calls.filter(([, key]) => key === 'automatedHunger')
    ).toHaveLength(1)
    expect(game.settings.get(SYSTEM_ID, 'automatedHunger')).toBe(true)
    expect(game.settings.get(SYSTEM_ID, 'automatedRage')).toBe(true)
  })

  it('applies normal master-toggle changes after the migration completes', async () => {
    fixture.stored.set(`${SYSTEM_ID}.forkIdentityMigrationVersion`, {
      key: `${SYSTEM_ID}.forkIdentityMigrationVersion`,
      value: 1
    })
    await applyAutomationToggle(true)
    expect(game.settings.set).toHaveBeenCalledTimes(4)
    expect(game.settings.get(SYSTEM_ID, 'automatedRage')).toBe(false)
    await applyAutomationToggle(false)
    expect(game.settings.get(SYSTEM_ID, 'automatedRage')).toBe(true)
  })

  it.each([{ isGM: false }, { isGM: true, activeGM: 'other' }])(
    'does not change world automation on a non-writing client',
    async ({ isGM, activeGM = 'gm' }) => {
      game.user.isGM = isGM
      game.users.activeGM.id = activeGM
      await applyAutomationToggle(true)
      expect(game.settings.set).not.toHaveBeenCalled()
    }
  )

  it('restores registered settings only, including explicit false and custom definitions', async () => {
    fixture.register('automatedHunger', { default: true })
    fixture.register('customDisciplines', { default: [] })
    fixture.stored.set('wod5e.automatedHunger', { key: 'wod5e.automatedHunger', value: false })
    fixture.stored.set('wod5e.customDisciplines', {
      key: 'wod5e.customDisciplines',
      value: [{ name: 'Custom' }]
    })
    fixture.stored.set('wod5e.unknown', { key: 'wod5e.unknown', value: 123 })
    await restoreForkSettings()
    expect(game.settings.get(SYSTEM_ID, 'automatedHunger')).toBe(false)
    expect(game.settings.get(SYSTEM_ID, 'customDisciplines')).toEqual([{ name: 'Custom' }])
    expect(fixture.stored.has(`${SYSTEM_ID}.unknown`)).toBe(false)
    expect(fixture.stored.has('wod5e.customDisciplines')).toBe(true)
  })

  it('preserves automation choices against disableAutomation onChange side effects', async () => {
    fixture.register('disableAutomation', {
      default: false,
      onChange: async () => {
        await game.settings.set(SYSTEM_ID, 'automatedHunger', false)
        await game.settings.set(SYSTEM_ID, 'automatedRage', false)
      }
    })
    fixture.register('automatedHunger', { default: true })
    fixture.register('automatedRage', { default: true })
    for (const [key, value] of Object.entries({
      'wod5e.disableAutomation': true,
      'wod5e.automatedHunger': true,
      [`${SYSTEM_ID}.automatedRage`]: true
    }))
      fixture.stored.set(key, { key, value })
    await restoreForkSettings()
    expect(game.settings.get(SYSTEM_ID, 'automatedHunger')).toBe(true)
    expect(game.settings.get(SYSTEM_ID, 'automatedRage')).toBe(true)
  })

  it('never replaces an embedded collection in a root update', () => {
    class ActorDocument extends TestDocument {
      static hierarchy = { items: {} }
    }
    const document = new ActorDocument({
      _id: 'a',
      items: [{ _id: 'i', img: 'systems/wod5e/a.png' }],
      img: 'systems/wod5e/b.png'
    })
    expect(buildForkDocumentUpdate(document)).toEqual({ img: 'systems/wod5e-gods/b.png' })
  })

  it('updates world and unlocked world packs once without touching locked/module packs', async () => {
    const actor = new TestDocument({ _id: 'a', flags: { wod5e: { old: 1 } } })
    const item = new TestDocument({ _id: 'i', img: 'systems/wod5e/old.png' })
    game.collections.set('Actor', [actor])
    const locked = {
      collection: 'world.locked',
      metadata: { packageType: 'world' },
      locked: true,
      getDocuments: vi.fn()
    }
    const module = { metadata: { packageType: 'module' }, getDocuments: vi.fn() }
    game.packs = [
      locked,
      module,
      { metadata: { packageType: 'world' }, getDocuments: vi.fn(async () => [item]) }
    ]
    await migrateForkIdentity()
    expect(actor.source.flags[SYSTEM_ID].old).toBe(1)
    expect(item.source.img).toBe('systems/wod5e-gods/old.png')
    expect(locked.getDocuments).not.toHaveBeenCalled()
    expect(module.getDocuments).not.toHaveBeenCalled()
    expect(game.settings.get(SYSTEM_ID, 'forkIdentityMigrationVersion')).toBe(1)
    await migrateForkIdentity()
    expect(actor.update).toHaveBeenCalledTimes(1)
  })

  it('does not advance the completion marker when any document write fails', async () => {
    const actor = new TestDocument({ _id: 'a', flags: { wod5e: { old: 1 } } })
    actor.update.mockRejectedValueOnce(Error('Database unavailable'))
    game.collections.set('Actor', [actor])
    await expect(migrateForkIdentity()).rejects.toThrow('Database unavailable')
    expect(game.settings.get(SYSTEM_ID, 'forkIdentityMigrationVersion')).toBe(0)
    await migrateForkIdentity()
    expect(game.settings.get(SYSTEM_ID, 'forkIdentityMigrationVersion')).toBe(1)
  })

  it.each([{ isGM: false }, { isGM: true, activeGM: 'other' }])(
    'does not write as player or secondary GM',
    async ({ isGM, activeGM = 'gm' }) => {
      game.user.isGM = isGM
      game.users.activeGM.id = activeGM
      expect(await migrateForkIdentity()).toBe(false)
      expect(game.settings.set).not.toHaveBeenCalled()
    }
  )

  it.each(['5.3.27-gods.7', '5.3.28', '5.3.28-gods.1', '6.0.0'])(
    'does not replay old data conversions for %s',
    (version) => expect(needsLegacyDataMigration(version, 0)).toBe(false)
  )
  it.each(['1.5', '4.6.1', '', undefined])('detects legacy data for %s', (version) =>
    expect(needsLegacyDataMigration(version, 0)).toBe(true)
  )
})
