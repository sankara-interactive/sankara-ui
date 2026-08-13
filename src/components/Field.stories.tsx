import type { Meta, StoryObj } from '@storybook/react'
import { Field } from './Field.js'

const meta: Meta<typeof Field> = {
  title: 'Forms/Field',
  component: Field,
}
export default meta

type Story = StoryObj<typeof Field>

export const EscapeHatch: Story = {
  render: () => (
    <Field name="colour" label="Farbe" description="Any control the package lacks">
      {({ id, describedBy, invalid }) => (
        <input
          className="sankara-field-control"
          type="color"
          id={id}
          aria-describedby={describedBy}
          aria-invalid={invalid}
        />
      )}
    </Field>
  ),
}

export const WithError: Story = {
  render: () => (
    <Field name="colour" label="Farbe" error="Bitte wählen Sie eine Farbe">
      {({ id, describedBy, invalid }) => (
        <input
          className="sankara-field-control"
          id={id}
          aria-describedby={describedBy}
          aria-invalid={invalid}
        />
      )}
    </Field>
  ),
}
