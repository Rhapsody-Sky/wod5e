import fs from 'fs'
import path from 'path'

import { ZipArchive } from 'archiver'

import { verifyRelease } from './verify-release.js'

// Output file
const outputFile = 'wod5e-gods.zip'

const errors = verifyRelease(process.cwd())
if (errors.length) throw new Error(errors.join('\n'))

// Delete the old outputFile if it already exists
if (fs.existsSync(outputFile)) {
  fs.unlinkSync(outputFile)
  console.log(`Deleted old ${outputFile} file, generating new release file...`)
}

// All important files to the system
const files = ['LICENSE.md', 'README.md', 'system.json']

// All important directories to the system
const directories = ['assets', 'display', 'lang', 'lib', 'macros', 'packs', 'system', 'docs']

const output = fs.createWriteStream(outputFile)
const archive = new ZipArchive('zip', {
  zlib: {
    level: 9
  }
})

output.on('close', () => {
  console.log(`WOD5E system release file ${outputFile} generated.`)
})

archive.on('warning', (err) => {
  throw err
})

archive.on('error', (err) => {
  throw err
})

archive.pipe(output)

// Add files
for (const file of files) {
  if (fs.existsSync(file)) {
    archive.file(file, {
      name: path.basename(file)
    })
  } else {
    throw new Error(`Required file wasn't found: ${file}`)
  }
}

// Add directories
for (const dir of directories) {
  if (fs.existsSync(dir)) {
    archive.directory(dir, dir)
  } else {
    throw new Error(`Required directory wasn't found: ${dir}`)
  }
}

await archive.finalize()
