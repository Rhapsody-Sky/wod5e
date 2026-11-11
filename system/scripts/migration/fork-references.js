import { FORK_IDENTITY_SCHEMA, LEGACY_SYSTEM_IDS, SYSTEM_ID } from '../../constants.js'
import { mergeMissing } from '../fork-compatibility.js'

export function rewriteForkString(value) {
  return (
    value
      .replace(/^(?:vtm5e|wod5e)\.(macros|conditions)$/, `${SYSTEM_ID}.$1`)
      // Only local package paths, not another website's /systems/ directory.
      .replace(/(?<![\w:/])([/]?)systems\/(?:vtm5e|wod5e)\//g, `$1systems/${SYSTEM_ID}/`)
      .replace(
        /\bCompendium\.(?:vtm5e|wod5e)\.(macros|conditions)(?=\.|\b)/g,
        `Compendium.${SYSTEM_ID}.$1`
      )
      .replace(/\b(?:vtm5e|wod5e)\.([A-Za-z]+Sheet)\b/g, `${SYSTEM_ID}.$1`)
      .replace(
        /((?:game\.settings\.(?:get|set)|\.(?:getFlag|setFlag|unsetFlag))\(\s*['"])(?:vtm5e|wod5e)(['"])/g,
        `$1${SYSTEM_ID}$2`
      )
  )
}

// Pure transformation: IDs, ownership and historical _stats are never rewritten.
// Old flag namespaces are retained byte-for-byte in the object; only the new copy
// is adapted. This also handles nested scene token deltas and embedded items.
export function migrateForkReferences(value) {
  if (typeof value === 'string') return rewriteForkString(value)
  if (Array.isArray(value)) return value.map(migrateForkReferences)
  if (!value || typeof value !== 'object') return value
  const result = {}
  for (const [key, entry] of Object.entries(value)) {
    if (key === '_stats' || key === '_id' || key === 'ownership') {
      result[key] = entry
    } else if (key === 'flags' && entry && typeof entry === 'object') {
      result.flags = migrateFlags(entry)
    } else if (key === 'system' && LEGACY_SYSTEM_IDS.includes(entry)) {
      result[key] = SYSTEM_ID
    } else {
      const migratedKey = key.replace(/^(?:vtm5e|wod5e)\.(macros|conditions)$/, `${SYSTEM_ID}.$1`)
      // An explicit destination entry wins over a legacy compendium-source key.
      if (migratedKey !== key && Object.hasOwn(value, migratedKey)) continue
      result[migratedKey] = migrateForkReferences(entry)
    }
  }
  return result
}

function migrateFlags(flags) {
  const result = { ...flags }
  let systemFlags = {}
  const scopes =
    flags[SYSTEM_ID]?._forkIdentityVersion >= FORK_IDENTITY_SCHEMA
      ? [SYSTEM_ID]
      : [...LEGACY_SYSTEM_IDS, SYSTEM_ID]
  for (const scope of scopes) {
    systemFlags = mergeMissing(systemFlags, flags[scope] ?? {})
  }
  if ([...LEGACY_SYSTEM_IDS, SYSTEM_ID].some((scope) => Object.hasOwn(flags, scope))) {
    result[SYSTEM_ID] = migrateForkReferences(systemFlags)
    result[SYSTEM_ID]._forkIdentityVersion = FORK_IDENTITY_SCHEMA
  }
  for (const [scope, entries] of Object.entries(flags)) {
    if (![...LEGACY_SYSTEM_IDS, SYSTEM_ID].includes(scope)) {
      result[scope] = migrateForkReferences(entries)
    }
  }
  return result
}
