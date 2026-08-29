export const CURRENT_DATA_SCHEMA_VERSION = 1
export const LEGACY_WORLD_VERSION = '1.5'
export const LEGACY_MIGRATION_BASELINE_VERSION = '5.0.0'

/**
 * Decide whether the one-time legacy migration bundle still needs to run.
 *
 * Worlds at version 5.0 or newer have passed through the complete legacy
 * bundle. They only need to be bootstrapped onto the independent data schema
 * counter. Fresh worlds and worlds which skipped that baseline still run the
 * bundle once.
 */
export function getMigrationPlan({ dataSchemaVersion = 0, worldVersion = LEGACY_WORLD_VERSION }) {
  const requiresSchemaUpgrade = Number(dataSchemaVersion) < CURRENT_DATA_SCHEMA_VERSION

  return {
    requiresSchemaUpgrade,
    runLegacyMigrations:
      requiresSchemaUpgrade &&
      compareVersionParts(worldVersion, LEGACY_MIGRATION_BASELINE_VERSION) < 0
  }
}

function compareVersionParts(left, right) {
  const toParts = (version) =>
    String(version)
      .match(/\d+/g)
      ?.slice(0, 3)
      .map(Number) ?? [0]
  const leftParts = toParts(left)
  const rightParts = toParts(right)

  for (let index = 0; index < 3; index += 1) {
    const difference = (leftParts[index] ?? 0) - (rightParts[index] ?? 0)
    if (difference !== 0) return Math.sign(difference)
  }

  return 0
}
