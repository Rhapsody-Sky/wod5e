import { getSystemFlag } from '../../../scripts/fork-compatibility.js'

export const _onCopyRollPrompt = async function (event) {
  event.preventDefault()

  const userId = game.users.current.id
  const savedRolls = await getSystemFlag(game.users.current, 'rollMenuSavedRolls')
  const rollId = await getSystemFlag(game.users.current, 'rollMenuActiveRoll')
  const activeRollObject = savedRolls[rollId]

  const dataId = `${userId}.${rollId}`
  const dataLabel = activeRollObject.name

  const rollString = `@RollPromptToChat[${dataId}]{${dataLabel}}`

  game.clipboard.copyPlainText(rollString)

  ui.notifications.info(
    game.i18n.format('WOD5E.StringCopiedToClipboard', {
      string: rollString
    })
  )
}
