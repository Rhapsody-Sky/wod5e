const ACTOR_GAMESYSTEM_CLASSES = ['vampire', 'hunter', 'werewolf', 'mortal', 'god']

/**
 * Keep exactly one gamesystem class on a dynamic SPC sheet.
 *
 * @param {HTMLElement} element The sheet's root element
 * @param {string} gamesystem The actor's current gamesystem
 */
export function syncActorGamesystemClass(element, gamesystem) {
  const gamesystemClass = ACTOR_GAMESYSTEM_CLASSES.includes(gamesystem) ? gamesystem : 'mortal'

  element.classList.remove(...ACTOR_GAMESYSTEM_CLASSES)
  element.classList.add(gamesystemClass)
}
