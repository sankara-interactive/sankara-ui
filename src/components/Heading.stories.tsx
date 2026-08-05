import type { Meta, StoryObj } from '@storybook/react'
import { Heading } from './Heading.js'

const meta: Meta<typeof Heading> = { component: Heading, title: 'Heading' }
export default meta

type Story = StoryObj<typeof Heading>

// The package ships size and line-height only. Weight, family and colour are
// the consumer's, so these stories add a weight inline to look like a real
// site rather than to demonstrate anything the package provides.
export const Scale: Story = {
  render: () => (
    <div className="font-semibold">
      <Heading level={1}>Unternehmensnachfolge (h1)</Heading>
      <Heading level={2}>Unsere Leistungen (h2)</Heading>
      <Heading level={3}>Nachfolgeplanung (h3)</Heading>
      <Heading level={4}>Erstgespräch (h4)</Heading>
      <Heading level={5}>Ohne Paketgrösse (h5)</Heading>
      <Heading level={6}>Ohne Paketgrösse (h6)</Heading>
    </div>
  ),
}

// The estate's dominant shape, 29 occurrences: a card title that is an h3 in
// the outline and an h4 on screen.
export const DemotedCardTitle: Story = {
  render: () => (
    <div className="font-semibold">
      <Heading level={2}>Sektionstitel, h2 und h2</Heading>
      <Heading level={3} visual={4}>
        Kartentitel, h3 im Outline und h4 auf dem Bildschirm
      </Heading>
    </div>
  ),
}

// h5 and h6 carry no package rule (D6), so they render at body size until the
// consumer defines those classes. This story is what that looks like.
export const UnstyledHooks: Story = {
  render: () => (
    <div className="font-semibold">
      <Heading level={4}>h4 — sized by the package</Heading>
      <Heading level={5}>h5 — a bare hook, body-sized</Heading>
    </div>
  ),
}
