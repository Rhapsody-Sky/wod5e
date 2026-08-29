import fs from 'fs'
import path from 'path'

const root = process.cwd()
const manifestPath = path.join(root, 'system.json')
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
const expectedVersion = process.argv[2] || process.env.RELEASE_VERSION || process.env.GITHUB_REF_NAME
const errors = []

const requireValue = (condition, message) => {
  if (!condition) errors.push(message)
}

requireValue(manifest.id === 'wod5e', 'system.json id must remain "wod5e"')
requireValue(
  /^\d+\.\d+\.\d+-gods\.\d+$/.test(manifest.version),
  `Invalid fork version: ${manifest.version}`
)
requireValue(
  manifest.url === 'https://github.com/Rhapsody-Sky/wod5e',
  'Package URL must point to the Rhapsody-Sky fork'
)
requireValue(
  manifest.manifest ===
    'https://github.com/Rhapsody-Sky/wod5e/releases/latest/download/system.json',
  'Manifest URL must point to the latest fork release'
)
requireValue(
  manifest.download ===
    `https://github.com/Rhapsody-Sky/wod5e/releases/download/${manifest.version}/wod5e.zip`,
  'Download URL must point to the versioned fork release'
)
requireValue(
  manifest.changelog === `https://github.com/Rhapsody-Sky/wod5e/releases/tag/${manifest.version}`,
  'Changelog URL must contain the package version'
)

if (expectedVersion) {
  requireValue(
    manifest.version === expectedVersion,
    `Release/tag version ${expectedVersion} does not match system.json ${manifest.version}`
  )
}

for (const relativePath of [...(manifest.esmodules ?? []), ...(manifest.styles ?? [])]) {
  requireValue(fs.existsSync(path.join(root, relativePath)), `Missing package entrypoint: ${relativePath}`)
}

if (errors.length) {
  console.error('Release verification failed:')
  for (const error of errors) console.error(`- ${error}`)
  process.exitCode = 1
} else {
  console.log(`Release metadata verified for ${manifest.version}.`)
}
