export const CURRENT_DATA_SCHEMA = 1

export function getMigrationPlan({ dataSchemaVersion = 0, worldVersion = '1.5' } = {}) {
  const requiresSchemaUpgrade = !(Number(dataSchemaVersion) >= CURRENT_DATA_SCHEMA)
  const match = String(worldVersion).match(/^(\d+)\.(\d+)/)
  return {
    requiresSchemaUpgrade,
    runLegacyMigrations: requiresSchemaUpgrade && (!match || Number(match[1]) < 5)
  }
}

export function needsLegacyDataMigration(worldVersion, dataSchemaVersion) {
  return getMigrationPlan({ worldVersion, dataSchemaVersion }).runLegacyMigrations
}
