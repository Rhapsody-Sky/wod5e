export const _onGodAttributeRoll = async function (event) {
  event.preventDefault()

  const attributes = Object.keys(this.actor.system.divineattributes).map((id) => ({
    id,
    label: game.i18n.localize(`WOD5E.God.AttributeList.${id}`)
  }))

  const content = await foundry.applications.handlebars.renderTemplate(
    'systems/wod5e/display/shared/actors/parts/god/attribute-roll-dialog.hbs',
    { attributes }
  )

  const result = await foundry.applications.api.DialogV2.input({
    window: {
      title: game.i18n.localize('WOD5E.God.SelectAttributes')
    },
    content,
    ok: {
      icon: 'fas fa-dice',
      label: game.i18n.localize('WOD5E.Confirm')
    },
    buttons: [
      {
        action: 'cancel',
        icon: 'fas fa-times',
        label: game.i18n.localize('WOD5E.Cancel')
      }
    ],
    classes: ['wod5e', 'god']
  })

  if (result === 'cancel') return

  const firstId = result.firstAttribute
  const secondId = result.secondAttribute

  if (!firstId || !secondId) {
    return ui.notifications.warn(game.i18n.localize('WOD5E.God.SelectTwoAttributes'))
  }

  if (firstId === secondId) {
    return ui.notifications.warn(game.i18n.localize('WOD5E.God.AttributesMustDiffer'))
  }

  const firstAttribute = attributes.find((attribute) => attribute.id === firstId)
  const secondAttribute = attributes.find((attribute) => attribute.id === secondId)

  return WOD5E.api.RollFromDataset({
    actor: this.actor,
    dataset: {
      label: `${firstAttribute.label} + ${secondAttribute.label}`,
      valuePaths: `divineattributes.${firstId}.value divineattributes.${secondId}.value`,
      selectors: `divineattributes divineattributes.${firstId} divineattributes.${secondId}`,
      disableAdvancedDice: true
    }
  })
}
