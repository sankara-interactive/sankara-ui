// @vitest-environment node
import fs from 'node:fs'
import { describe, expect, it } from 'vitest'

// D2: none of the six form primitives may declare 'use client' or use
// useId -- either would make a page with a form ship JavaScript from this
// package. scripts/check-directives.mjs only verifies that files which
// already declare 'use client' keep it through the build; it cannot catch a
// component that gains the directive (or useId) in the first place. This is
// that regression guard, read straight from source.
const FILES = ['Field.tsx', 'Input.tsx', 'Textarea.tsx', 'Checkbox.tsx', 'RadioGroup.tsx', 'Select.tsx']

// Strip comments before matching -- Field.tsx documents in a comment *why* it
// avoids useId, and that mention must not itself trip the guard.
const stripComments = (source: string) =>
  source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')

describe('form primitives stay server components', () => {
  for (const file of FILES) {
    it(`${file} declares no 'use client' and does not use useId`, () => {
      const source = stripComments(fs.readFileSync(new URL(`./${file}`, import.meta.url), 'utf8'))
      expect(source, `${file} must not declare 'use client'`).not.toMatch(/['"]use client['"]/)
      expect(source, `${file} must not use useId`).not.toMatch(/\buseId\b/)
    })
  }
})
