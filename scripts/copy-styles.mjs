import fs from 'node:fs'

fs.mkdirSync('dist/styles', { recursive: true })
fs.copyFileSync('src/styles/tokens.css', 'dist/styles/tokens.css')
console.log('copied src/styles/tokens.css -> dist/styles/tokens.css')
