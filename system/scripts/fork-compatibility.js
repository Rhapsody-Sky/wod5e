import { FORK_IDENTITY_SCHEMA, LEGACY_SYSTEM_IDS, SYSTEM_ID } from '../constants.js'

const isObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value)

// The destination wins, including explicit false, zero, empty arrays and null.
export function mergeMissing(source = {}, destination = {}) {
  const merged = { ...source, ...destination }
  for (const [key, value] of Object.entries(destination)) {
    if (isObject(value) && isObject(source[key])) merged[key] = mergeMissing(source[key], value)
  }
  return merged
}

// Legacy scopes are not active packages, so Document.getFlag must not be called on them.
export function getSystemFlags(document) {
  const flags = document?.flags ?? {}
  // After copying a document, deleted new flags must not reappear from old data.
  if (flags[SYSTEM_ID]?._forkIdentityVersion >= FORK_IDENTITY_SCHEMA) return flags[SYSTEM_ID]
  return [...LEGACY_SYSTEM_IDS, SYSTEM_ID].reduce(
    (result, scope) => mergeMissing(result, flags[scope] ?? {}),
    {}
  )
}

export function getSystemFlag(document, key) {
  return key.split('.').reduce((value, part) => value?.[part], getSystemFlags(document))
}

export function getStoredSetting(id, scope, settings = game.settings) {
  const storage = settings.storage.get(scope)
  if (scope === 'client') {
    const raw = storage.getItem(id)
    if (raw === null || raw === undefined) return { exists: false }
    try {
      return { exists: true, value: JSON.parse(raw) }
    } catch {
      return { exists: true, value: raw }
    }
  }
  const user = scope === 'user' ? game.userId : null
  const document = [...storage.values()].find(
    (setting) => setting.key === id && (setting.user ?? null) === user
  )
  return document ? { exists: true, value: document.value } : { exists: false }
}

// Read through before the GM persists the migration at ready. Foundry forbids world
// setting writes during init; definitions and players must nevertheless see old values.
export function getSystemSetting(key) {
  const id = `${SYSTEM_ID}.${key}`
  const config = game.settings.settings?.get(id)
  if (!config) return game.settings.get(SYSTEM_ID, key)
  if (!getStoredSetting(id, config.scope).exists) {
    for (const scope of [...LEGACY_SYSTEM_IDS].reverse()) {
      const old = getStoredSetting(`${scope}.${key}`, config.scope)
      if (old.exists) return old.value
    }
  }
  return game.settings.get(SYSTEM_ID, key)
}
