// Package references now include avatars, scenes, journals, chat, embedded items
// and UUIDs, not only a document's img field. Retain the legacy macro entry point.
export { migrateForkIdentity as MigrateImageLinks } from '../system/scripts/migration/migrate-fork-identity.js'
