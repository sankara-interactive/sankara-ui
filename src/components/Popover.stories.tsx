import type { Meta, StoryObj } from '@storybook/react'
import { Popover } from './Popover.js'

const meta: Meta<typeof Popover> = { component: Popover, title: 'Popover' }
export default meta

export const NavDropdown: StoryObj<typeof Popover> = {
  render: () => (
    <nav className="p-8">
      <ul className="flex gap-6">
        <li>
          <Popover
            id="nav-leistungen"
            className="w-72 rounded-card bg-surface p-2 text-on-surface shadow-raised"
            trigger={
              <button type="button" className="flex items-center gap-2 font-medium">
                Leistungen
                <span className="popover-open:rotate-180 transition-transform">v</span>
              </button>
            }
          >
            <ul>
              <li><a className="block px-3 py-2" href="#beratung">Beratung</a></li>
              <li><a className="block px-3 py-2" href="#umsetzung">Umsetzung</a></li>
            </ul>
          </Popover>
        </li>
        <li>
          <Popover
            id="nav-ueber-uns"
            className="w-72 rounded-card bg-surface p-2 text-on-surface shadow-raised"
            trigger={<button type="button" className="font-medium">Über uns</button>}
          >
            <ul>
              <li><a className="block px-3 py-2" href="#team">Team</a></li>
            </ul>
          </Popover>
        </li>
      </ul>
    </nav>
  ),
}

export const FilterPanel: StoryObj<typeof Popover> = {
  render: () => (
    <div className="p-8">
      <Popover
        id="filter-thema"
        placement="bottom"
        className="w-96 rounded-card bg-surface p-6 text-on-surface shadow-raised"
        trigger={<button type="button" className="rounded-full border px-4 py-2">Thema</button>}
      >
        <div className="flex flex-wrap gap-2">
          {['Gesundheit', 'Bildung', 'Wasser'].map(tag => (
            <button key={tag} type="button" className="rounded-full border px-3 py-1 text-sm">
              {tag}
            </button>
          ))}
        </div>
      </Popover>
    </div>
  ),
}

export const Placements: StoryObj<typeof Popover> = {
  render: () => (
    <div className="grid min-h-[60vh] place-items-center gap-6 p-24">
      <div className="flex gap-4">
        {(['bottom-start', 'bottom', 'bottom-end', 'top-start', 'top', 'top-end'] as const).map(
          placement => (
            <Popover
              key={placement}
              id={`placement-${placement}`}
              placement={placement}
              className="w-48 rounded-card bg-surface p-4 text-on-surface shadow-raised"
              trigger={<button type="button" className="rounded border px-3 py-2">{placement}</button>}
            >
              <p>{placement}</p>
            </Popover>
          )
        )}
      </div>
    </div>
  ),
}
