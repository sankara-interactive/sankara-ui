import type { Preview } from '@storybook/react'
import './preview.css'

const preview: Preview = {
  // The a11y addon surfaces violations in the manual panel only. `test:
  // 'error'` would fail runs, but that requires @storybook/addon-vitest or
  // the legacy test-runner, neither of which is installed, and no workflow
  // runs build-storybook. CI enforcement is a deliberate follow-up, not
  // wired here.
  parameters: { a11y: {} },
}

export default preview
