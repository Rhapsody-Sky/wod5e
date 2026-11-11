import { describe, expect, it } from 'vitest'

import { CURRENT_DATA_SCHEMA, getMigrationPlan } from '#system/scripts/migration/migration-state.js'

describe('getMigrationPlan', () => {
  it('runs the legacy bundle once for a genuinely legacy world', () => {
    expect(getMigrationPlan({ dataSchemaVersion: 0, worldVersion: '1.5' })).toEqual({
      requiresSchemaUpgrade: true,
      runLegacyMigrations: true
    })
  })

  it('runs the bundle for a pre-5.0 world which skipped intermediate releases', () => {
    expect(getMigrationPlan({ dataSchemaVersion: 0, worldVersion: '4.9.2' })).toEqual({
      requiresSchemaUpgrade: true,
      runLegacyMigrations: true
    })
  })

  it('uses 5.0 as the completed legacy-migration baseline', () => {
    expect(getMigrationPlan({ dataSchemaVersion: 0, worldVersion: '5.0.0' })).toEqual({
      requiresSchemaUpgrade: true,
      runLegacyMigrations: false
    })
  })

  it('bootstraps an already migrated world without rerunning historical migrations', () => {
    expect(getMigrationPlan({ dataSchemaVersion: 0, worldVersion: '5.3.27-gods.7' })).toEqual({
      requiresSchemaUpgrade: true,
      runLegacyMigrations: false
    })
  })

  it('does nothing once the current data schema has been recorded', () => {
    expect(
      getMigrationPlan({
        dataSchemaVersion: CURRENT_DATA_SCHEMA,
        worldVersion: '5.3.28-gods.1'
      })
    ).toEqual({
      requiresSchemaUpgrade: false,
      runLegacyMigrations: false
    })
  })
})
