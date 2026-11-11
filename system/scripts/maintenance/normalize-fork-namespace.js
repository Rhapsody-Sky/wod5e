// Narrow mechanical adaptation after an upstream merge. Keep CSS names, window IDs,
// WOD5E.api and translation keys intact. Default is a read-only check.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, URL } from 'node:url'

const root = fileURLToPath(new URL('../../../', import.meta.url))
const write = process.argv.includes('--write')
const changed = []
const excluded = new Set([
  'system/scripts/maintenance/normalize-fork-namespace.js',
  'system/scripts/fork-compatibility.js'
])

function visit(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const filename = path.join(directory, entry.name)
    if (entry.isDirectory()) visit(filename)
    else if (/\.(js|hbs|less|db)$/.test(entry.name)) normalize(filename)
  }
}

function normalize(filename) {
  const relative = path.relative(root, filename).replaceAll('\\', '/')
  if (
    excluded.has(relative) ||
    relative.includes('/maintenance/') ||
    /\/(fork-references|migrate-fork-identity|migrate-system-flags|restore-vtm5e-world-settings)\.js$/.test(
      relative
    )
  )
    return
  const original = fs.readFileSync(filename, 'utf8')
  let text = original.replaceAll('systems/wod5e/', 'systems/wod5e-gods/')
  if (filename.endsWith('.js')) {
    const helpers = new Set()
    text = text.replace(/game\.settings\.get\('wod5e',\s*/g, () => {
      helpers.add('getSystemSetting')
      return 'getSystemSetting('
    })
    text = text.replace(/([\w$]+(?:\??\.[\w$]+)*)\??\.getFlag\('wod5e',\s*/g, (_, doc) => {
      helpers.add('getSystemFlag')
      return `getSystemFlag(${doc}, `
    })
    text = text.replace(/([\w$]+(?:\??\.[\w$]+)*)\??\.flags\??\.wod5e/g, (_, doc) => {
      helpers.add('getSystemFlags')
      return `getSystemFlags(${doc})`
    })
    text = text.replace(
      /(game\.(?:settings|keybindings)\.(?:set|register|registerMenu)\()'wod5e'/g,
      "$1'wod5e-gods'"
    )
    text = text.replace(/(\.(?:setFlag|unsetFlag)\()'wod5e'/g, "$1'wod5e-gods'")
    text = text.replace(/(registerSheet\((?:Actor|Item), )'wod5e'/g, "$1'wod5e-gods'")
    text = text.replaceAll("system.wod5e'", "system.wod5e-gods'")
    text = text.replaceAll('`wod5e.', '`wod5e-gods.')
    text = text.replaceAll('flags.wod5e.', 'flags.wod5e-gods.')
    text = text.replace(/\bwod5e: \{/g, "'wod5e-gods': {")
    if (relative === 'system/dice/dice-so-nice.js') {
      text = text.replaceAll(
        "id: 'wod5e', name: 'wod5e'",
        "id: 'wod5e-gods', name: 'World of Darkness 5e – Gods'"
      )
      text = text.replaceAll("system: 'wod5e'", "system: 'wod5e-gods'")
    }
    if (helpers.size) {
      let helperPath = path
        .relative(path.dirname(filename), path.join(root, 'system/scripts/fork-compatibility.js'))
        .replaceAll('\\', '/')
      if (!helperPath.startsWith('.')) helperPath = `./${helperPath}`
      text = `import { ${[...helpers].sort().join(', ')} } from '${helperPath}'\n${text}`
    }
  } else if (filename.endsWith('.hbs')) {
    // Hyphens are valid Handlebars path segments. Brackets would become part of
    // native HTML form field names and write to an invalid flag namespace.
    text = text.replaceAll('flags.wod5e.', 'flags.wod5e-gods.')
    text = text.replaceAll('flags.[wod5e-gods].', 'flags.wod5e-gods.')
  } else if (filename.endsWith('.db')) {
    text = text.replaceAll('"wod5e":', '"wod5e-gods":')
  }
  text = text.replace(/^(import \{ getSystem[^\n]+\} from '[^\n]+'\r?\n)\r?\n(?=\/\/|\/\*)/, '$1')
  if (text === original) return
  changed.push(relative)
  if (write) fs.writeFileSync(filename, text)
}

for (const directory of ['system', 'display', 'macros', 'packs']) visit(path.join(root, directory))
console.log(`${write ? 'Adapted' : 'Needs adaptation:'} ${changed.length} files`)
if (!write && changed.length) {
  console.log(changed.join('\n'))
  process.exitCode = 1
}
