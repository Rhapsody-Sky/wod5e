import { FORK_IDENTITY_SCHEMA, SYSTEM_ID } from '../constants.js'

// Foundry broadcasts setting changes to every client and does not promise to
// await asynchronous onChange handlers. Copying the old master toggle must not
// launch delayed writes that overwrite the separately restored choices.
export async function applyAutomationToggle(disabled) {
  if (!game.user.isGM || (game.users.activeGM && game.users.activeGM.id !== game.user.id)) return
  if (game.settings.get(SYSTEM_ID, 'forkIdentityMigrationVersion') < FORK_IDENTITY_SCHEMA) return
  for (const key of [
    'automatedWillpower',
    'automatedHunger',
    'automatedOblivion',
    'automatedRage'
  ]) {
    await game.settings.set(SYSTEM_ID, key, !disabled)
  }
}
