// Preserve the upstream entry point for existing macros, using the fork's
// awaited migration rather than an inactive flag namespace.
export { migrateForkIdentity as MigrateSystemFlags } from './migrate-fork-identity.js'
