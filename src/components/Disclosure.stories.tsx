import type { Meta, StoryObj } from '@storybook/react'
import type { ReactNode } from 'react'
import { Disclosure } from './Disclosure.js'

const meta: Meta<typeof Disclosure> = { component: Disclosure, title: 'Disclosure' }
export default meta

const QUESTIONS = [
  {
    question: 'Wie lange dauert ein Projekt?',
    answer: 'Zwischen vier und zwölf Wochen, je nach Umfang und Anzahl Feedbackrunden.',
  },
  {
    question: 'Was kostet eine Website?',
    answer: 'Nach Aufwand, mit einem Kostendach, das wir vor dem Start gemeinsam festlegen.',
  },
  {
    question: 'Arbeitet ihr remote?',
    answer: 'Ja. Workshops halten wir gerne vor Ort, den Rest asynchron.',
  },
]

function List({
  name,
  indicator,
  openFirst,
}: {
  name?: string
  indicator?: ReactNode
  openFirst?: boolean
}) {
  return (
    <div>
      {QUESTIONS.map((item, i) => (
        <Disclosure
          key={item.question}
          name={name}
          indicator={indicator}
          defaultOpen={openFirst && i === 0}
          summary={<h3 className="font-medium">{item.question}</h3>}
          className="border-t border-muted py-5"
        >
          <p className="pt-4 text-muted">{item.answer}</p>
        </Disclosure>
      ))}
    </div>
  )
}

// No `name`: each item opens and closes on its own.
export const Default: StoryObj<typeof Disclosure> = {
  render: () => <List />,
}

export const OpenOnLoad: StoryObj<typeof Disclosure> = {
  render: () => <List openFirst />,
}

// Same `name` on every item is the native exclusive accordion — no JS, no state.
export const ExclusiveGroup: StoryObj<typeof Disclosure> = {
  render: () => <List name="faq-storybook" />,
}

// Plus/minus swap, the fgpfister.ch pattern: the root carries `group`, so a
// caller-supplied indicator expresses its own open state.
export const CustomIndicator: StoryObj<typeof Disclosure> = {
  render: () => (
    <List
      indicator={
        <span aria-hidden className="shrink-0 text-primary">
          <span className="group-open:hidden">+</span>
          <span className="hidden group-open:inline">−</span>
        </span>
      }
    />
  ),
}
