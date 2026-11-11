import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { SYSTEM_ID } from '../../constants.js'

const repository = 'https://github.com/Rhapsody-Sky/wod5e'

function filesIn(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const filename = path.join(directory, entry.name)
    return entry.isDirectory() ? filesIn(filename) : [filename]
  })
}

export function verifyRelease(root, expectedVersion) {
  const errors = []
  const check = (condition, message) => {
    if (!condition) errors.push(message)
  }
  const manifest = JSON.parse(fs.readFileSync(path.join(root, 'system.json'), 'utf8'))
  check(manifest.id === SYSTEM_ID, `Package ID must be ${SYSTEM_ID}, never upstream wod5e`)
  check(/^\d+\.\d+\.\d+-gods\.\d+$/.test(manifest.version), 'Invalid Gods release version')
  if (expectedVersion)
    check(manifest.version === expectedVersion, 'Tag and manifest version differ')
  check(manifest.url === repository, 'Repository must belong to the fork')
  check(manifest.bugs === `${repository}/issues`, 'Issue tracker must belong to the fork')
  check(
    manifest.manifest === `${repository}/releases/latest/download/system.json`,
    'Update manifest must belong to the fork'
  )
  check(
    manifest.download === `${repository}/releases/download/${manifest.version}/wod5e-gods.zip`,
    'Download must point to the versioned fork ZIP'
  )
  check(
    manifest.changelog === `${repository}/releases/tag/${manifest.version}`,
    'Changelog must belong to the release'
  )
  check(
    manifest.authors?.[0]?.name.includes('Rhapsody-Sky'),
    'Fork maintainer must be first author'
  )
  check(
    manifest.authors?.some((author) => author.name.includes('Veilza')),
    'Retain upstream credit'
  )
  check(Object.hasOwn(manifest.documentTypes.Actor, 'god'), 'God Actor model must be declared')
  check(
    manifest.packs.every((pack) => pack.system === SYSTEM_ID),
    'Compendiums must use the fork system ID'
  )
  check(
    manifest.background === `systems/${SYSTEM_ID}/assets/images/gods-banner.svg`,
    'Own package background is required'
  )
  check(
    manifest.media?.some(
      (media) => media.type === 'setup' && media.thumbnail === manifest.background
    ),
    'Own setup thumbnail is required'
  )

  const required = [
    ...manifest.esmodules,
    // Foundry serializes installed styles as {src, layer}; source manifests may
    // use strings. Verify both the ZIP and an installed copy before switching.
    ...manifest.styles.map((style) => (typeof style === 'string' ? style : style.src)),
    ...manifest.languages.map((lang) => lang.path),
    'assets/images/gods-banner.svg',
    'system/actor/data-models/god-actor-model.js',
    'display/ui/god-roll-dialog.hbs',
    'display/shared/actors/parts/god/attribute-roll-dialog.hbs',
    'system/scripts/migration/migrate-fork-identity.js',
    'system/scripts/automation-settings.js',
    'system/scripts/maintenance/migrate-fork-world.js',
    'docs/FORK-MIGRATION.md'
  ]
  for (const file of required)
    check(fs.existsSync(path.join(root, file)), `Missing required file: ${file}`)
  for (const pack of manifest.packs) {
    // Foundry supports the upstream's legacy NeDB source packs and converts them
    // to LevelDB. Both original capitalization and IDs are intentionally retained.
    check(
      fs.existsSync(path.join(root, pack.path)) ||
        fs.existsSync(path.join(root, 'packs', `${pack.label}.db`)),
      `Missing pack: ${pack.name}`
    )
  }

  for (const folder of ['system', 'display', 'macros']) {
    for (const filename of filesIn(path.join(root, folder))) {
      if (!/\.(js|hbs|less|css)$/.test(filename)) continue
      const relative = path.relative(root, filename).replaceAll('\\', '/')
      const text = fs.readFileSync(filename, 'utf8')
      if (relative.includes('/maintenance/') || relative.endsWith('/fork-references.js')) continue
      check(!text.includes('systems/wod5e/'), `Inactive package path in ${relative}`)
      check(
        !/name=['"]flags\.\[wod5e-gods\]/.test(text),
        `Invalid form flag namespace in ${relative}`
      )
      check(
        !/\b(?:getFlag|setFlag|unsetFlag)\(\s*['"]wod5e['"]/.test(text),
        `Inactive flag API in ${relative}`
      )
      check(
        !/game\.settings\.(get|set|register|registerMenu)\(\s*['"]wod5e['"]/.test(text),
        `Inactive setting API in ${relative}`
      )
      if (filename.endsWith('.js')) {
        const imports =
          /^\s*(?:import\s+(?:[\w$*{},\s]+?\s+from\s+)?|export\s+(?:\*|\{[^}]*\})\s+from\s+)['"](\.\.?\/[^'"]+)['"]/gm
        for (const match of text.matchAll(imports)) {
          check(
            fs.existsSync(path.resolve(path.dirname(filename), match[1])),
            `Missing import ${match[1]} in ${relative}`
          )
        }
      }
      for (const match of text.matchAll(/systems\/wod5e-gods\/([^'"`\s)<>{}]+)/g)) {
        const asset = match[1]
        if (!asset || asset.endsWith('/') || asset.includes('$')) continue
        check(
          fs.existsSync(path.join(root, asset)),
          `Missing referenced file ${asset} in ${relative}`
        )
      }
    }
  }
  for (const filename of filesIn(path.join(root, 'packs'))) {
    if (!filename.endsWith('.db')) continue
    const relative = path.relative(root, filename).replaceAll('\\', '/')
    const ids = new Set()
    for (const line of fs.readFileSync(filename, 'utf8').split(/\r?\n/).filter(Boolean)) {
      const document = JSON.parse(line)
      if (!document._id || document.$$deleted) continue
      check(!ids.has(document._id), `Duplicate compendium ID ${document._id} in ${relative}`)
      ids.add(document._id)
      const inspect = (value) => {
        if (typeof value === 'string') {
          check(!value.includes('systems/wod5e/'), `Inactive resource path in ${relative}`)
          for (const match of value.matchAll(/systems\/wod5e-gods\/([^'"`\s)<>{}]+)/g)) {
            if (match[1].endsWith('/') || match[1].includes('$')) continue
            check(
              fs.existsSync(path.join(root, match[1])),
              `Missing pack resource ${match[1]} in ${relative}`
            )
          }
        } else if (Array.isArray(value)) value.forEach(inspect)
        else if (value && typeof value === 'object') {
          for (const [key, entry] of Object.entries(value)) if (key !== '_stats') inspect(entry)
        }
      }
      inspect(document)
    }
  }
  const workflow = path.join(root, '.github/workflows/release.yml')
  if (fs.existsSync(workflow)) {
    check(
      !fs.readFileSync(workflow, 'utf8').includes('/_api/packages/release_version/'),
      'Fork must not publish as official Foundry package'
    )
  }
  return [...new Set(errors)]
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = path.resolve(process.argv[2] || '.')
  const errors = verifyRelease(root, process.env.RELEASE_VERSION)
  if (errors.length) {
    console.error(errors.join('\n'))
    process.exitCode = 1
  } else console.log(`Verified ${SYSTEM_ID} release identity, runtime resources and branding`)
}
