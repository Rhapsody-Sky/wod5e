/**
 * Limit the roll dialog's discipline selector to disciplines owned by an actor.
 *
 * Visibility is the canonical signal used by the character sheet. Value and
 * power checks retain disciplines from older or partially migrated actor data.
 * An explicitly selected discipline is always retained so fixed-pool rolls do
 * not lose their configured selection.
 *
 * @param {object} definitions All registered discipline definitions
 * @param {object} actor       Actor whose sheet initiated the roll
 * @param {string} selected    Optional discipline preselected by the roll
 * @returns {object} Filtered definitions in their original display order
 */
export function getActorDisciplineOptions(definitions, actor, selected = '') {
  const actorDisciplines = actor?.system?.disciplines ?? {}

  return Object.fromEntries(
    Object.entries(definitions).filter(([id]) => {
      const discipline = actorDisciplines[id]
      if (!discipline) return id === selected

      const hasValue = Number(discipline.value) > 0
      const hasPowers = Array.isArray(discipline.powers) && discipline.powers.length > 0

      return discipline.visible === true || hasValue || hasPowers || id === selected
    })
  )
}
