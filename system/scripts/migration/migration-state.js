export const CURRENT_DATA_SCHEMA = 1

export function needsLegacyDataMigration(version, schema) {
  if (schema >= CURRENT_DATA_SCHEMA) return false
  const match = String(version).match(/^(\d+)\.(\d+)/)
  return !match || Number(match[1]) < 5
}
