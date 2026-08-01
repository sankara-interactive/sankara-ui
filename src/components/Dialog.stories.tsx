import type { Meta, StoryObj } from '@storybook/react'
import { useState } from 'react'
import { Dialog, type DialogProps } from './Dialog.js'

const meta: Meta<typeof Dialog> = { component: Dialog, title: 'Dialog' }
export default meta

// The open state always lives with the consumer — there is no built-in trigger.
function Demo({ label, ...props }: { label: string } & Omit<DialogProps, 'open' | 'onRequestClose' | 'children'>) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-card bg-primary px-5 py-2.5 text-primary-contrast"
      >
        {label}
      </button>

      <Dialog
        {...props}
        open={open}
        onRequestClose={() => setOpen(false)}
        aria-labelledby="dialog-title"
        className="rounded-card bg-surface p-8 text-on-surface shadow-raised"
      >
        <h2 id="dialog-title" className="mb-4 text-xl font-medium">
          An welchem Standort möchten Sie einen Termin vereinbaren?
        </h2>
        <p className="mb-6 text-muted">
          Escape, ein Klick auf den Hintergrund und der Abbrechen-Button lösen alle dieselbe
          Schliess-Anfrage aus.
        </p>
        {/* autoFocus on the least-destructive control, per the spec's a11y section. */}
        <button
          type="button"
          autoFocus
          onClick={() => setOpen(false)}
          className="rounded-card border border-muted px-5 py-2.5"
        >
          Abbrechen
        </button>
      </Dialog>
    </>
  )
}

export const Centered: StoryObj<typeof Dialog> = {
  render: () => <Demo label="Termin vereinbaren" />,
}

// The fgpfister.ch / fairmed.ch-sb shape: an off-canvas panel on the inline edge.
export const SideSheet: StoryObj<typeof Dialog> = {
  render: () => <Demo label="Menü öffnen" placement="end" />,
}

export const Large: StoryObj<typeof Dialog> = {
  render: () => <Demo label="Grosser Dialog" size="lg" />,
}

// Escape still closes it — closeOnOutsideClick governs outside clicks only.
export const NoOutsideClick: StoryObj<typeof Dialog> = {
  render: () => <Demo label="Nur per Button schliessen" closeOnOutsideClick={false} />,
}
