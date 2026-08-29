import { MigrateLegacySheets } from './migration/migrate-legacy-sheets.js'
import { MigrateSpecialties } from './migration/migrate-specialties.js'
import { MigrateItemImages } from './migration/migrate-item-images.js'
import { MigrateAnimalKen } from './migration/migrate-animal-ken.js'
import { MigrateGroupSheets } from './migration/migrate-group-sheets.js'
import { MigrateAbilitiesToAttributes } from './migration/migrate-abilities-to-attributes.js'
import { MigrateRolldataToDicepools } from './migration/migrate-rolldata-to-dicepools.js'
import { MigrateOldDetailsToNewItems } from './migration/migrate-old-details-to-new-items.js'
import { MigrateGeneralDifficulty } from './migration/migrate-general-difficulty.js'
import { MigrateSystemFlags } from './migration/migrate-system-flags.js'
import { RestoreOldWorldSettings } from './migration/restore-vtm5e-world-settings.js'
import {
  CURRENT_DATA_SCHEMA_VERSION,
  getMigrationPlan
} from './migration/migration-state.js'
import { MigrateImageLinks } from '../../macros/migrate-image-links.js'

export const migrateWorld = async () => {
  // Only allow the Game Master to run this script
  if (!game.user.isGM) return false

  // Store current loaded version of the system
  const currentVersion = game.system.version
  // Store the world version pre-migration
  const worldVersion = game.settings.get('wod5e', 'worldVersion') || '1.5'
  const dataSchemaVersion = game.settings.get('wod5e', 'dataSchemaVersion') || 0
  const migrationPlan = getMigrationPlan({ dataSchemaVersion, worldVersion })

  console.log('World of Darkness 5e | Current SchreckNet Layer v' + worldVersion)

  const updates = []

  try {
    if (migrationPlan.runLegacyMigrations) {
      ui.notifications.info('New version detected. Updating SchreckNet, please wait.')
      console.log(
        `World of Darkness 5e | Migrating data schema v${dataSchemaVersion} to v${CURRENT_DATA_SCHEMA_VERSION}`
      )

      updates.push(...(await runLegacyMigrations()))
    } else if (migrationPlan.requiresSchemaUpgrade) {
      console.log(
        `World of Darkness 5e | Recording existing world at data schema v${CURRENT_DATA_SCHEMA_VERSION}`
      )
    }

    await MigrateSystemFlags()
    await RestoreOldWorldSettings()
    await MigrateImageLinks()

    // Persist migration state only after every migration completed successfully.
    if (migrationPlan.requiresSchemaUpgrade) {
      await game.settings.set('wod5e', 'dataSchemaVersion', CURRENT_DATA_SCHEMA_VERSION)
    }
    if (worldVersion !== currentVersion) {
      await game.settings.set('wod5e', 'worldVersion', currentVersion)
    }

    if (updates.length > 0) {
      ui.notifications.info('Upgrade complete! Foundry will now refresh in 15 seconds...')

      setTimeout(() => {
        foundry.utils.debouncedReload()
      }, 15000)
    } else if (worldVersion !== currentVersion) {
      ui.notifications.info('Welcome to version ' + currentVersion)
    }

    return true
  } catch (error) {
    console.error('World of Darkness 5e | Error during update:', error)
    ui.notifications.error('World of Darkness 5e | Migration failed. No migration state was saved.')
    return false
  }
}

async function runLegacyMigrations() {
  const migrationSteps = [
    MigrateLegacySheets,
    MigrateSpecialties,
    MigrateItemImages,
    MigrateAnimalKen,
    MigrateGroupSheets,
    MigrateAbilitiesToAttributes,
    MigrateRolldataToDicepools,
    MigrateOldDetailsToNewItems,
    MigrateGeneralDifficulty
  ]
  const updates = []

  for (const migrate of migrationSteps) {
    const migrationIDs = await migrate()
    updates.push(...migrationIDs)
  }

  return updates
}
