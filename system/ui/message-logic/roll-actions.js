function hasClass(die, className) {
  const classes = Array.isArray(die?.classes)
    ? die.classes
    : String(die?.classes ?? '').split(/\s+/)
  return classes.includes(className)
}

export function getRollActionState({
  basicDice,
  advancedDice,
  canManage = false,
  isContentVisible = true
}) {
  const dice = [...(basicDice?.results ?? []), ...(advancedDice?.results ?? [])]
  const hasRerolledDice = dice.some((die) => die.discarded || hasClass(die, 'rerolled'))
  const hasRerollableDice = dice.some((die) => hasClass(die, 'rerollable'))
  const mayReroll = canManage && isContentVisible && dice.length > 0 && !hasRerolledDice

  return {
    canViewRollDetails: isContentVisible && dice.length > 0,
    canAnyReroll: mayReroll,
    canWillpowerReroll: mayReroll && hasRerollableDice
  }
}

export function _onExpandRollDetails(event, target) {
  event.preventDefault()
  // Delegate to Foundry's existing expandRoll action with the original dice-roll target.
  target.closest('.dice-roll[data-action="expandRoll"]')?.click()
}
