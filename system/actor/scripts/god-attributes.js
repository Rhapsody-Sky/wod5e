// Shared display order for the sheet, the two-attribute dialog and the Roll Menu.
export const DIVINE_ATTRIBUTE_DISPLAY_ORDER = Object.freeze([
  'aspect',
  'identity',
  'power',
  'force',
  'insight'
])

export function getDivineAttributeLabelKey(id) {
  return `WOD5E.God.AttributeList.${id}`
}
