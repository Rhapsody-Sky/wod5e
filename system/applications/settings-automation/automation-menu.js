import { getSystemSetting } from '../../scripts/fork-compatibility.js'

export class AutomationMenu extends FormApplication {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      title: game.i18n.localize('WOD5E.Settings.AutomationSettings'),
      id: 'wod5e-automation',
      classes: ['wod5e'],
      template: 'systems/wod5e-gods/display/ui/automation-menu.hbs',
      width: 500,
      height: 'auto',
      resizable: true,
      closeOnSubmit: false
    })
  }

  /* -------------------------------------------- */

  /** @override */
  async getData() {
    const data = await super.getData()

    // Encrich editor content
    data.disableAutomation = getSystemSetting('disableAutomation')
    data.automatedWillpower = getSystemSetting('automatedWillpower')
    data.automatedHunger = getSystemSetting('automatedHunger')
    data.automatedOblivion = getSystemSetting('automatedOblivion')
    data.automatedRage = getSystemSetting('automatedRage')

    return data
  }

  /* -------------------------------------------- */

  /** @override */
  activateListeners(html) {
    html[0].querySelectorAll('input').forEach((input) => {
      input.addEventListener('change', function (event) {
        event.preventDefault()
        const data = event.target.dataset

        if (data?.id) {
          const settingId = data.id
          const value = event.target.checked

          game.settings.set('wod5e-gods', settingId, value)
        }
      })
    })
  }
}
