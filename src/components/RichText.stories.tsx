import type { Meta, StoryObj } from '@storybook/react'
import { RichText } from './RichText.js'

const meta: Meta<typeof RichText> = { component: RichText, title: 'RichText' }
export default meta

// Shaped like real CMS output: headings, lists, a link, a table, a rule — and
// "Unternehmensnachfolge", the compound the hyphenation policy exists for.
const cmsDocument = (
  <>
    <h2>Unternehmensnachfolge richtig planen</h2>
    <p>
      Wir begleiten Sie bei der Übergabe Ihres Lebenswerks — von der ersten
      Standortbestimmung bis zum Vertragsabschluss.
    </p>
    <h3>Unsere Leistungen</h3>
    <ul>
      <li>Unternehmensbewertung</li>
      <li>
        Nachfolgeplanung
        <ul>
          <li>Familieninterne Lösungen</li>
          <li>Verkauf an Dritte</li>
        </ul>
      </li>
      <li>Steuerliche Begleitung</li>
    </ul>
    <h4>Ablauf</h4>
    <ol>
      <li>Erstgespräch</li>
      <li>Analyse</li>
    </ol>
    <p>
      Mehr dazu in unserem <a href="#leitfaden">Leitfaden zur Nachfolge</a>.
    </p>
    <table>
      <thead>
        <tr>
          <th>Phase</th>
          <th>Dauer</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>Analyse</td>
          <td>4 Wochen</td>
        </tr>
        <tr>
          <td>Umsetzung</td>
          <td>3 Monate</td>
        </tr>
      </tbody>
    </table>
    <hr />
    <blockquote>Eine Nachfolge ist ein Prozess, kein Ereignis.</blockquote>
  </>
)

export const Default: StoryObj<typeof RichText> = {
  render: () => (
    <div className="p-8" lang="de">
      <RichText>{cmsDocument}</RichText>
    </div>
  ),
}

export const WithoutMeasure: StoryObj<typeof RichText> = {
  render: () => (
    <div className="p-8" lang="de">
      <RichText measure={false}>{cmsDocument}</RichText>
    </div>
  ),
}

// The narrow column is where German compounds overflow — this is the story the
// hyphenation policy exists for.
export const NarrowColumn: StoryObj<typeof RichText> = {
  render: () => (
    <div className="max-w-[18rem] p-8" lang="de">
      <RichText>
        <h2>Unternehmensnachfolge</h2>
        <p>Beteiligungsgesellschaft und Standortbestimmung in einer schmalen Spalte.</p>
      </RichText>
    </div>
  ),
}
