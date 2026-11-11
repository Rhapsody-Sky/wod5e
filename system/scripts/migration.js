import { MigrateLegacySheets } from './migration/migrate-legacy-sheets.js'
import { MigrateSpecialties } from './migration/migrate-specialties.js'
import { MigrateItemImages } from './migration/migrate-item-images.js'
import { MigrateAnimalKen } from './migration/migrate-animal-ken.js'
import { MigrateGroupSheets } from './migration/migrate-group-sheets.js'
import { MigrateAbilitiesToAttributes } from './migration/migrate-abilities-to-attributes.js'
import { MigrateRolldataToDicepools } from './migration/migrate-rolldata-to-dicepools.js'
import { MigrateOldDetailsToNewItems } from './migration/migrate-old-details-to-new-items.js'
import { MigrateGeneralDifficulty } from './migration/migrate-general-difficulty.js'
import { migrateForkIdentity } from './migration/migrate-fork-identity.js'
import { getSystemSetting } from './fork-compatibility.js'
import { SYSTEM_ID } from '../constants.js'
import { CURRENT_DATA_SCHEMA, getMigrationPlan } from './migration/migration-state.js'

// Changing release version or package ID must not replay ancient actor conversions
// on a modern Gods world. Advance markers only after successful awaited writes.
export async function migrateWorld() {
  if (!game.user.isGM || (game.users.activeGM && game.users.activeGM.id !== game.user.id)) return

  await migrateForkIdentity()
  const worldVersion = getSystemSetting('worldVersion') || '1.5'
  const dataSchemaVersion = game.settings.get(SYSTEM_ID, 'dataSchemaVersion')
  const plan = getMigrationPlan({ worldVersion, dataSchemaVersion })
  const updates = []
  if (plan.runLegacyMigrations) {
    ui.notifications.info('Updating legacy World of Darkness data. Please keep this world open.')
    for (const migrate of [
      MigrateLegacySheets,
      MigrateSpecialties,
      MigrateItemImages,
      MigrateAnimalKen,
      MigrateGroupSheets,
      MigrateAbilitiesToAttributes,
      MigrateRolldataToDicepools,
      MigrateOldDetailsToNewItems,
      MigrateGeneralDifficulty
    ]) {
      updates.push(...(await migrate()))
    }
  }
  if (plan.requiresSchemaUpgrade)
    await game.settings.set(SYSTEM_ID, 'dataSchemaVersion', CURRENT_DATA_SCHEMA)
  if (worldVersion !== game.system.version)
    await game.settings.set(SYSTEM_ID, 'worldVersion', game.system.version)
  if (updates.length) {
    ui.notifications.info('Upgrade complete. Foundry will refresh in 15 seconds.')
    setTimeout(() => foundry.utils.debouncedReload(), 15000)
  }
}
