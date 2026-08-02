import fs from 'node:fs'

fs.copyFileSync('src/styles/tokens.css', 'dist/styles.css')
console.log('copied src/styles/tokens.css -> dist/styles.css')
