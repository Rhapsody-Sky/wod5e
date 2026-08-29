/**
 * Determine whether a vampire can add a Blood Surge to a roll.
 *
 * @param {Actor} actor The actor making the roll
 * @returns {boolean} Whether the Blood Surge option should be available
 */
export function canActorBloodSurge(actor) {
  if (actor?.system?.gamesystem !== 'vampire' || actor?.type === 'ghoul') return false

  const hungerValue = Number(actor.system?.hunger?.value)
  const hungerMax = Number(actor.system?.hunger?.max)

  return Number.isFinite(hungerValue) && Number.isFinite(hungerMax) && hungerValue < hungerMax
}
