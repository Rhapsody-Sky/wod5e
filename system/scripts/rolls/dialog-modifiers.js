/**
 * Determine how a situational modifier should be split between basic and
 * resource-driven advanced dice.
 *
 * @param {object} options Modifier context
 * @returns {{applyDiceTo: string, checkValue: number}} Target pool and resource cap
 */
export function getSituationalModifierTarget({
  requestedTarget = 'basic',
  modifier,
  basicValue,
  advancedValue,
  disableAdvancedDice,
  systemData,
  actor
}) {
  let applyDiceTo = requestedTarget
  const checkValue =
    systemData?.usesResourceOnAdvancedDice && systemData?.resourceValuePath
      ? Number(foundry.utils.getProperty(actor?.system, systemData.resourceValuePath)) || 0
      : 0

  if (!disableAdvancedDice) {
    if (modifier < 0) {
      if (systemData?.usesResourceOnAdvancedDice && basicValue === 0) {
        applyDiceTo = 'advanced'
      }
    } else if (advancedValue < checkValue) {
      applyDiceTo = 'advanced'
    }
  }

  return { applyDiceTo, checkValue }
}
