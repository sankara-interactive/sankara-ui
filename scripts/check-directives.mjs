import fs from 'node:fs'
import path from 'node:path'

const read = dir =>
  fs
    .readdirSync(dir, { recursive: true, withFileTypes: true })
    .filter(entry => entry.isFile())
    .map(entry => path.join(entry.parentPath, entry.name))

const sources = read('src').filter(file => /\.tsx?$/.test(file) && !/\.(test|stories)\./.test(file))
const missing = []
let declaring = 0

for (const source of sources) {
  if (!/^['"]use client['"]/.test(fs.readFileSync(source, 'utf8'))) continue
  declaring++
  const emitted = path
    .join('dist', path.relative('src', source))
    .replace(/\.tsx?$/, '.js')
  if (!fs.existsSync(emitted)) {
    missing.push(`${emitted} (not emitted)`)
    continue
  }
  if (!/^['"]use client['"]/.test(fs.readFileSync(emitted, 'utf8'))) {
    missing.push(`${emitted} (directive lost)`)
  }
}

if (missing.length > 0) {
  console.error(`'use client' not preserved in:\n${missing.map(m => `  ${m}`).join('\n')}`)
  process.exit(1)
}

console.log(`'use client' preserved in all ${declaring} source files that declare it.`)
