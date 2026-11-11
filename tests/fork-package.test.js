import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'

import Handlebars from 'handlebars'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { verifyRelease } from '../system/scripts/maintenance/verify-release.js'
import {
  planWorldSwitch,
  runWorldSwitch,
  verifyBackupCoverage
} from '../system/scripts/maintenance/migrate-fork-world.js'
import { loadHotbarDrop } from '../system/scripts/hotbar-drop.js'
import { loadDiceSoNice } from '../system/dice/dice-so-nice.js'

vi.mock('../system/actor/scripts/item-roll.js', () => ({ _rollItem: vi.fn() }))

const directories = []
function temporary() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'gods-fork-test-'))
  directories.push(root)
  return root
}
afterEach(() => {
  vi.restoreAllMocks()
  // Only fixture directories created by this test, never a project/data root.
  for (const root of directories.splice(0)) {
    const resolved = fs.realpathSync(root)
    if (
      path.dirname(resolved) !== fs.realpathSync(os.tmpdir()) ||
      !path.basename(resolved).startsWith('gods-fork-test-')
    )
      throw new Error('Unsafe fixture cleanup path')
    fs.rmSync(resolved, { recursive: true })
  }
})

describe('Fork release safeguards', () => {
  it('uses native form field paths, not bracket-quoted namespace names', () => {
    const template = fs.readFileSync('display/shared/items/parts/item-settings.hbs', 'utf8')
    expect(template).not.toContain('flags.[wod5e-gods]')
    expect(
      Handlebars.compile('{{flags.wod5e-gods.saved}}')({
        flags: { 'wod5e-gods': { saved: 'value' } }
      })
    ).toBe('value')
  })
  it('validates the complete candidate, including referenced files', () => {
    expect(verifyRelease(process.cwd(), '5.3.28-gods.2')).toEqual([])
  })
  it('rejects a tag that disagrees with the manifest', () => {
    expect(verifyRelease(process.cwd(), '5.3.28')).toContain('Tag and manifest version differ')
  })
  it('is distinct from the official package and keeps credit and own setup image', () => {
    const manifest = JSON.parse(fs.readFileSync('system.json', 'utf8'))
    expect(manifest.id).toBe('wod5e-gods')
    expect(manifest.authors[0].url).toBe('https://github.com/Rhapsody-Sky')
    expect(manifest.authors.some((author) => author.url === 'https://github.com/Veilza')).toBe(true)
    expect(manifest.media[0].thumbnail).toBe(manifest.background)
    expect(manifest.download).not.toContain('WoD5E-Developers')
    expect(fs.readFileSync('.github/workflows/release.yml', 'utf8')).not.toContain(
      'FOUNDRY_API_TOKEN'
    )
  })
  it('compiles all templates after the resource/flag namespace change', () => {
    const visit = (root) =>
      fs.readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
        const filename = path.join(root, entry.name)
        return entry.isDirectory() ? visit(filename) : filename.endsWith('.hbs') ? [filename] : []
      })
    for (const filename of visit('display')) {
      expect(() => Handlebars.precompile(fs.readFileSync(filename, 'utf8')), filename).not.toThrow()
    }
  })
})

describe('Upstream 5.3.28 behavior retained', () => {
  it('lets Foundry handle normal hotbar macros but still resolves items', () => {
    let callback
    vi.stubGlobal('Hooks', {
      on: (_name, handler) => {
        callback = handler
      }
    })
    const lookup = vi.fn(() => undefined)
    vi.stubGlobal('fromUuidSync', lookup)
    loadHotbarDrop()
    expect(callback({}, { type: 'Macro', uuid: 'Macro.a' }, 1)).toBeUndefined()
    expect(lookup).not.toHaveBeenCalled()
    callback({}, { type: 'Item', uuid: 'Item.a' }, 1)
    expect(lookup).toHaveBeenCalledWith('Item.a')
  })
  it('does not write calculated actor values into compendiums', () => {
    const actor = fs.readFileSync('system/actor/actor.js', 'utf8')
    expect(actor).toContain('this.isOwner && !this.inCompendium')
    expect(actor).toContain('systemData.rage.value > 0 && !this.inCompendium')
  })
  it('registers divine dice in the fork and preserves five distinct success faces', async () => {
    const presets = []
    const systems = []
    const dice3d = {
      addSystem: (system) => systems.push(system),
      addDicePreset: (preset) => presets.push(preset),
      addColorset: vi.fn()
    }
    await loadDiceSoNice(dice3d)
    expect(systems[0].id).toBe('wod5e-gods')
    const god = presets.find((preset) => preset.type === 'do')
    expect(god.system).toBe('wod5e-gods')
    expect(god.labels).toHaveLength(10)
    expect(new Set(god.labels.slice(0, 5)).size).toBe(1)
    expect(new Set(god.labels.slice(5)).size).toBe(5)
  })
})

describe('Offline world switch', () => {
  it('requires backup coverage of the whole world, including databases and empty directories', () => {
    const worldPath = temporary()
    fs.mkdirSync(path.join(worldPath, 'data'))
    fs.mkdirSync(path.join(worldPath, 'empty-directory'))
    fs.writeFileSync(path.join(worldPath, 'world.json'), '{}')
    fs.writeFileSync(path.join(worldPath, 'data/actors.db'), 'actor data')
    const entries = [
      'my-world/',
      'my-world/world.json',
      'my-world/data/',
      'my-world/data/actors.db',
      'my-world/empty-directory/'
    ]
    expect(() => verifyBackupCoverage(worldPath, 'my-world', entries)).not.toThrow()
    expect(() => verifyBackupCoverage(worldPath, 'my-world', ['my-world/world.json'])).toThrow(
      'incomplete'
    )
    expect(() =>
      verifyBackupCoverage(
        worldPath,
        'my-world',
        entries.filter((entry) => !entry.endsWith('actors.db'))
      )
    ).toThrow('actors.db')
  })

  it.each(['another-world/world.json', 'my-world/../outside', '/my-world/world.json'])(
    'refuses unrelated or unsafe archive paths: %s',
    (entry) => expect(() => verifyBackupCoverage(temporary(), 'my-world', [entry])).toThrow()
  )

  it('changes only identity/references and preserves last system/core versions and IDs', () => {
    const world = {
      id: 'migration-example-world',
      system: 'wod5e',
      systemVersion: '5.3.27-gods.7',
      coreVersion: '14.367',
      lastPlayed: 'old',
      packs: [
        { system: 'wod5e', path: 'worlds/migration-example-world/packs/powers', name: 'powers' }
      ]
    }
    const result = planWorldSwitch(world)
    expect(result).toEqual({
      ...world,
      system: 'wod5e-gods',
      packs: [{ ...world.packs[0], system: 'wod5e-gods' }]
    })
    expect(world.system).toBe('wod5e')
  })
  it.each(['dnd5e', 'vtm5e'])('refuses unrelated/untransitioned %s worlds', (system) =>
    expect(() => planWorldSwitch({ system })).toThrow()
  )
  it('does not write anything during the default dry run and reports incompatible modules', () => {
    const root = temporary()
    const worldPath = path.join(root, 'Data/worlds/my-world')
    const packagePath = path.join(root, 'Data/systems/wod5e-gods')
    const modulePath = path.join(root, 'Data/modules/old-addon')
    for (const directory of [worldPath, packagePath, modulePath])
      fs.mkdirSync(directory, { recursive: true })
    const source = JSON.stringify({
      id: 'my-world',
      system: 'wod5e',
      systemVersion: '5.3.27-gods.7'
    })
    fs.writeFileSync(path.join(worldPath, 'world.json'), source)
    fs.writeFileSync(
      path.join(packagePath, 'system.json'),
      JSON.stringify({ id: 'wod5e-gods', documentTypes: { Actor: { god: {} } } })
    )
    fs.writeFileSync(
      path.join(modulePath, 'module.json'),
      JSON.stringify({ id: 'old-addon', relationships: { systems: [{ id: 'wod5e' }] } })
    )
    vi.spyOn(console, 'log').mockImplementation(() => {})
    const result = runWorldSwitch(['--data-path', root, '--world', 'my-world'])
    expect(result.applied).toBe(false)
    expect(result.moduleWarnings).toEqual([{ id: 'old-addon', supportedSystems: ['wod5e'] }])
    expect(fs.readFileSync(path.join(worldPath, 'world.json'), 'utf8')).toBe(source)
    expect(fs.readdirSync(worldPath)).toEqual(['world.json'])
  })
  it.each(['../other-world', '/tmp/world', '..\\outside'])(
    'refuses unsafe world IDs: %s',
    (world) =>
      expect(() => runWorldSwitch(['--data-path', path.resolve('.'), '--world', world])).toThrow()
  )
})
