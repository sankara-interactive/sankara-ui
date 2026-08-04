import type { Meta, StoryObj } from '@storybook/react'
import { Button } from './Button.js'

const meta: Meta<typeof Button> = { component: Button, title: 'Button' }
export default meta

const skin = 'rounded-card bg-primary px-5 py-2.5 font-medium text-primary-contrast'
const skinSecondary = 'rounded-card border border-muted px-5 py-2.5 font-medium text-on-surface'

export const Default: StoryObj<typeof Button> = {
  render: () => (
    <div className="flex gap-4 p-8">
      <Button className={skin}>Termin vereinbaren</Button>
      <Button className={skinSecondary}>Mehr erfahren</Button>
    </div>
  ),
}

export const AsLink: StoryObj<typeof Button> = {
  // Storybook cannot import next/link; a plain <a> exercises the same path.
  render: () => (
    <div className="p-8">
      <Button className={skin} render={<a href="#kontakt" />}>Kontakt aufnehmen</Button>
    </div>
  ),
}

export const Submit: StoryObj<typeof Button> = {
  render: () => (
    <form className="flex items-end gap-4 p-8" onSubmit={event => event.preventDefault()}>
      <label className="flex flex-col gap-1">
        <span className="text-sm text-muted">E-Mail</span>
        <input className="rounded-card border border-muted px-3 py-2" type="email" />
      </label>
      <Button className={skin} type="submit">Absenden</Button>
      <Button className={skinSecondary}>Zurücksetzen (kein submit)</Button>
    </form>
  ),
}

export const Disabled: StoryObj<typeof Button> = {
  render: () => (
    <div className="flex gap-4 p-8">
      <Button className={`${skin} disabled:opacity-45`} disabled>
        Nicht verfügbar
      </Button>
    </div>
  ),
}
