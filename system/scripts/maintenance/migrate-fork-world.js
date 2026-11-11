// Offline descriptor switch ONLY. Never edit Foundry's LevelDB databases here.
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

import { LEGACY_SYSTEM_IDS, SYSTEM_ID } from '../../constants.js'
import { migrateForkReferences, rewriteForkString } from '../migration/fork-references.js'
import { verifyRelease } from './verify-release.js'

export function planWorldSwitch(world) {
  if (!LEGACY_SYSTEM_IDS.includes(world.system) && world.system !== SYSTEM_ID) {
    throw new Error(`Refusing unrelated system: ${world.system}`)
  }
  if (world.system === 'vtm5e')
    throw new Error('Complete the official vtm5e → wod5e transition first')
  // Leave systemVersion, coreVersion, IDs and the last-played timestamp intact.
  const result = { ...world, system: SYSTEM_ID }
  if (world.packs) result.packs = migrateForkReferences(world.packs)
  for (const key of ['background', 'cover']) {
    if (typeof world[key] === 'string') result[key] = rewriteForkString(world[key])
  }
  return result
}

function refuseRunningFoundry() {
  for (const entry of fs.readdirSync('/proc')) {
    if (!/^\d+$/.test(entry)) continue
    try {
      const args = fs.readFileSync(`/proc/${entry}/cmdline`, 'utf8').split('\0')
      if (args.some((arg) => /\/resources\/app\/main\.js$/.test(arg))) {
        throw new Error(`Foundry is running (PID ${entry}). Stop it before applying the switch.`)
      }
    } catch (error) {
      if (!['ENOENT', 'EACCES', 'ESRCH'].includes(error.code)) throw error
    }
  }
}

export function inspectModuleCompatibility(directory) {
  if (!fs.existsSync(directory)) return []
  return fs.readdirSync(directory).flatMap((id) => {
    const filename = path.join(directory, id, 'module.json')
    if (!fs.existsSync(filename)) return []
    const module = JSON.parse(fs.readFileSync(filename, 'utf8'))
    const systems = module.relationships?.systems ?? []
    if (!systems.length || systems.some((system) => system.id === SYSTEM_ID)) return []
    return [{ id, supportedSystems: systems.map((system) => system.id) }]
  })
}

export function verifyBackupCoverage(worldPath, worldId, archiveEntries) {
  const entries = new Set(
    archiveEntries.map((entry) => entry.replace(/^\.\//, '').replace(/\/$/, ''))
  )
  for (const entry of entries) {
    if (
      !entry ||
      entry.startsWith('/') ||
      entry.split('/').includes('..') ||
      (entry !== worldId && !entry.startsWith(`${worldId}/`))
    )
      throw new Error(`Backup contains an unrelated or unsafe entry: ${entry}`)
  }
  const visit = (directory) => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      if (/[\r\n]/.test(entry.name))
        throw new Error('Cannot safely verify a newline in a world filename')
      const filename = path.join(directory, entry.name)
      const relative = path.relative(worldPath, filename).replaceAll('\\', '/')
      if (!entries.has(`${worldId}/${relative}`))
        throw new Error(`Backup is incomplete: missing ${relative}`)
      if (entry.isDirectory()) visit(filename)
    }
  }
  visit(worldPath)
}

export function runWorldSwitch(args) {
  const option = (name) => {
    const index = args.indexOf(name)
    return index < 0 ? undefined : args[index + 1]
  }
  const dataPath = option('--data-path')
  const worldId = option('--world')
  if (!dataPath || !worldId || !/^[a-z0-9][a-z0-9_-]*$/i.test(worldId)) {
    throw new Error(
      'Usage: --data-path ABSOLUTE_PATH --world WORLD_ID [--apply --backup WORLD_BACKUP.tar.gz]'
    )
  }
  if (!path.isAbsolute(dataPath)) throw new Error('Data path must be absolute')
  const root = fs.realpathSync(dataPath)
  const worlds = fs.realpathSync(path.join(root, 'Data/worlds'))
  const worldPath = fs.realpathSync(path.join(worlds, worldId))
  if (path.dirname(worldPath) !== worlds) throw new Error('World path escapes the worlds directory')
  const filename = path.join(worldPath, 'world.json')
  const original = fs.readFileSync(filename)
  const world = JSON.parse(original)
  if (world.id !== worldId) throw new Error('World folder and world ID differ')
  const packagePath = path.join(root, 'Data/systems', SYSTEM_ID)
  const manifest = JSON.parse(fs.readFileSync(path.join(packagePath, 'system.json'), 'utf8'))
  if (manifest.id !== SYSTEM_ID || !manifest.documentTypes.Actor.god) {
    // The type's declaration is an empty object and therefore truthy.
    throw new Error('Install the verified Gods fork under its own ID before migrating')
  }
  const result = planWorldSwitch(world)
  const moduleWarnings = inspectModuleCompatibility(path.join(root, 'Data/modules'))
  console.log(
    JSON.stringify(
      { world: world.id, path: worldPath, from: world.system, to: result.system, moduleWarnings },
      null,
      2
    )
  )
  if (!args.includes('--apply')) return { applied: false, world: result, moduleWarnings }
  if (world.system === SYSTEM_ID)
    throw new Error('World is already switched; nothing was overwritten')
  if (process.platform !== 'linux')
    throw new Error('Applying the switch is supported on Linux only')
  refuseRunningFoundry()
  const packageErrors = verifyRelease(packagePath)
  if (packageErrors.length)
    throw new Error(`Installed fork failed verification:\n${packageErrors.join('\n')}`)
  const backupPath = option('--backup')
  if (!backupPath || !path.isAbsolute(backupPath))
    throw new Error('A matching absolute-path world backup is required')
  const backup = fs.realpathSync(backupPath)
  if (backup.startsWith(`${worldPath}${path.sep}`))
    throw new Error('Backup must be outside the world directory')
  const entries = execFileSync('tar', ['-tzf', backup], {
    encoding: 'utf8',
    maxBuffer: 16 * 1024 * 1024
  })
    .trimEnd()
    .split('\n')
  verifyBackupCoverage(worldPath, worldId, entries)
  const archived = execFileSync('tar', ['-xOf', backup, `${worldId}/world.json`])
  if (!original.equals(archived))
    throw new Error('Backup world.json does not match the current descriptor')
  // Compare contents and metadata as well; a stale archive or descriptor-only
  // backup is not a recovery point for the subsequent document migration.
  execFileSync('tar', ['--compare', '--gzip', '--file', backup, '--directory', worlds], {
    stdio: 'pipe'
  })
  if (moduleWarnings.length && !args.includes('--acknowledge-module-warnings')) {
    throw new Error(
      'Review module compatibility first; then explicitly acknowledge the reported warnings'
    )
  }
  const safetyCopy = path.join(
    path.dirname(backup),
    `${worldId}.before-${SYSTEM_ID}.${crypto.randomUUID()}.json`
  )
  fs.writeFileSync(safetyCopy, original, { flag: 'wx' })
  if (!fs.readFileSync(filename).equals(original))
    throw new Error('World changed since inspection; refusing write')
  const temporary = path.join(worldPath, `.world-system-switch-${crypto.randomUUID()}.json`)
  const handle = fs.openSync(temporary, 'wx', fs.statSync(filename).mode)
  try {
    fs.writeFileSync(handle, `${JSON.stringify(result, null, 2)}\n`)
    fs.fsyncSync(handle)
  } finally {
    fs.closeSync(handle)
  }
  // Single atomic replacement; no databases, other worlds or old packages touched.
  fs.renameSync(temporary, filename)
  console.log(`Switched descriptor. Exact previous world.json retained at ${safetyCopy}`)
  return { applied: true, world: result, moduleWarnings, safetyCopy }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    runWorldSwitch(process.argv.slice(2))
  } catch (error) {
    console.error(error.message)
    process.exitCode = 1
  }
}
