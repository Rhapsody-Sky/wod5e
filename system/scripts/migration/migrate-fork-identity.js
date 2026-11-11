import { FORK_IDENTITY_SCHEMA, LEGACY_SYSTEM_IDS, SYSTEM_ID } from '../../constants.js'
import { getStoredSetting } from '../fork-compatibility.js'
import { migrateForkReferences } from './fork-references.js'

// Settings are copied only when absent at the destination. Await each write, and
// keep the source keys for recovery. Callback order must not reset automation:
// disableAutomation runs before the individual automation settings are restored.
export async function restoreForkSettings() {
  const automationValues = new Map()
  const pending = []
  for (const [id, config] of game.settings.settings) {
    if (!id.startsWith(`${SYSTEM_ID}.`) || config.scope !== 'world') continue
    const existing = getStoredSetting(id, 'world')
    if (existing.exists) {
      if (config.key.startsWith('automated')) automationValues.set(config.key, existing.value)
      continue
    }
    for (const scope of [...LEGACY_SYSTEM_IDS].reverse()) {
      const old = getStoredSetting(`${scope}.${config.key}`, 'world')
      if (!old.exists) continue
      pending.push({ key: config.key, value: migrateForkReferences(old.value) })
      if (config.key.startsWith('automated')) automationValues.set(config.key, old.value)
      break
    }
  }
  for (const { key, value } of pending) await game.settings.set(SYSTEM_ID, key, value)
  // disableAutomation's normal onChange writes four other settings. Restore the
  // captured per-option choices, including already existing destination values.
  for (const [key, value] of automationValues) {
    if (game.settings.get(SYSTEM_ID, key) !== value) await game.settings.set(SYSTEM_ID, key, value)
  }

  // The core setting keeps its scope, but the class IDs inside it have changed.
  for (const key of ['sheetClasses', 'keybindings']) {
    const old = getStoredSetting(`core.${key}`, 'world')
    if (!old.exists) continue
    const migrated = migrateForkReferences(old.value)
    if (key === 'keybindings' && migrated['wod5e.compendium-browser-open']) {
      migrated[`${SYSTEM_ID}.compendium-browser-open`] ??= migrated['wod5e.compendium-browser-open']
    }
    if (JSON.stringify(migrated) !== JSON.stringify(old.value)) {
      await game.settings.set('core', key, migrated)
    }
  }
}

// Client preferences are per-browser; perform this on every client during init.
export function restoreForkClientSettings() {
  const storage = game.settings.storage.get('client')
  for (const [id, config] of game.settings.settings) {
    if (!id.startsWith(`${SYSTEM_ID}.`) || config.scope !== 'client') continue
    if (storage.getItem(id) !== null) continue
    for (const scope of [...LEGACY_SYSTEM_IDS].reverse()) {
      const old = storage.getItem(`${scope}.${config.key}`)
      if (old === null) continue
      storage.setItem(id, old)
      break
    }
  }
}

export function buildForkDocumentUpdate(document) {
  const source = document.toObject()
  const migrated = migrateForkReferences(source)
  const embeddedFields = Object.keys(document.constructor.hierarchy ?? {})
  const update = {}
  for (const [key, value] of Object.entries(migrated)) {
    if (['_id', '_stats', 'ownership', ...embeddedFields].includes(key)) continue
    if (JSON.stringify(value) !== JSON.stringify(source[key])) update[key] = value
  }
  return update
}

async function migrateDocumentTree(root) {
  const documents = [root, ...[...root.traverseEmbeddedDocuments()].map(([, doc]) => doc)]
  let count = 0
  // Embedded collections are handled by their own Documents, never by replacing
  // a root's entire items/tokens array (especially important for unlinked tokens).
  for (const document of documents) {
    const update = buildForkDocumentUpdate(document)
    if (!Object.keys(update).length) continue
    await document.update(update, { diff: false, recursive: false })
    count++
  }
  return count
}

export async function migrateForkIdentity() {
  // One active GM writes; players use the read-through helpers in the meantime.
  if (!game.user.isGM || (game.users.activeGM && game.users.activeGM.id !== game.user.id))
    return false
  if (game.settings.get(SYSTEM_ID, 'forkIdentityMigrationVersion') >= FORK_IDENTITY_SCHEMA)
    return false

  ui.notifications.info('Gods fork: migrating package references. Please keep this world open.')
  await restoreForkSettings()
  let count = 0
  for (const collection of game.collections.values()) {
    if (collection.documentName === 'Setting') continue
    for (const document of collection) count += await migrateDocumentTree(document)
  }

  // Third-party/system packs and locked world packs are not silently modified.
  // UUID redirects and read-through flag helpers keep their old references usable.
  const skipped = []
  for (const pack of game.packs) {
    if (pack.metadata.packageType !== 'world') continue
    if (pack.locked) {
      skipped.push(pack.collection)
      continue
    }
    for (const document of await pack.getDocuments()) count += await migrateDocumentTree(document)
  }
  await game.settings.set(SYSTEM_ID, 'forkIdentityMigrationVersion', FORK_IDENTITY_SCHEMA)
  console.log(
    `Gods fork | Identity migration complete: ${count} documents. Locked world packs:`,
    skipped
  )
  ui.notifications.info('Gods fork: package reference migration complete. Legacy data retained.')
  return true
}
