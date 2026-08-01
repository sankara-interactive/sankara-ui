# `Dialog` — Design

Date: 2026-08-01
Status: draft, revised after external review; approval gated on the browser/AT
matrix in Risks
Scope: Tier 2 of `next-storyblok-template/docs/enhancement-roadmap.md`, second component

## Problem

Four of the five surveyed projects put a modal overlay on screen, and all four
solved it differently: Radix Dialog twice, Headless UI Dialog once, and one
hand-rolled off-canvas panel with a manual `document.documentElement` scroll
lock and no dialog semantics at all. Two headless libraries are paid for to get
behaviour the platform now ships.

## Evidence base

| Project | Component | Mechanism | Shape | Opened by | Notes |
| --- | --- | --- | --- | --- | --- |
| brillen-werk.ch | `BookingButton` | `@radix-ui/react-dialog` | centered | its own `Dialog.Trigger` | Title + Close, portal, overlay |
| nuwa.swiss | `helpers/modal.js` | `@headlessui/react` `Dialog` | centered | parent state **and URL query** | `size` small/medium/default; used in 3 places |
| fgpfister.ch | `MobileNav` | `@radix-ui/react-dialog` | side sheet | `useState` in the nav | slide-in/out keyframes, overlay fade |
| fairmed.ch-sb | `MainMenu` | hand-rolled | side sheet | `useState` | `fixed left-full` + transform, manual scroll lock, **no dialog role, no focus trap, no Esc** |
| numbers.ch | — | — | — | — | `Gallery` is a slider, not an overlay |

Four findings:

1. **Two shapes, not one.** Centered modal (brillen-werk, nuwa) and side sheet /
   off-canvas nav (fgpfister, fairmed). They differ in positioning, in the
   transform they animate, and in what "size" means — but the trap, the backdrop
   and the dismiss contract are identical.
2. **fairmed's is the warning.** It is the one that skipped a library, and it is
   missing the focus trap, dialog semantics, Esc-to-close and inertness, while
   hand-maintaining a scroll lock on `<html>`. This is exactly the class of bug
   the platform now removes.
3. **Open state is never local to the dialog.** brillen-werk is the only one
   using a self-contained trigger. nuwa opens from parent state *and* from URL
   query params (`?diseaseId=…`, with `noindex` while open); fgpfister and
   fairmed open from nav state. Any API that assumes a built-in trigger fails
   three of four usages.
4. **`size` is real.** nuwa parameterises small/medium/default max-widths across
   its three call sites.

## Decisions

### D1 — Native `<dialog>` with `showModal()`

`showModal()` supplies, with no dependency: the top layer (no z-index
coordination), `::backdrop`, focus containment, Esc-to-close, modal dialog
semantics, inertness of everything behind, and focus restoration on close. That
is the entire reason Radix and Headless UI were imported.

Two qualifications the first draft got wrong:

- `showModal()` does **not** stamp `role="dialog"` or `aria-modal` onto the
  element. Modality is conferred by the top layer and the spec's accessibility
  mapping, not by attributes — so do not assert the attributes are there, and do
  not add them by hand either.
- Focus restoration returns focus to whatever was focused when `showModal()`
  ran, and only if that element is still focusable. For nuwa's URL-driven opens
  there may be no meaningful trigger at all. Native restoration is a good
  default, not a guarantee that focus lands somewhere useful.

This is the same native-first call as `Disclosure`, and that spec's reasoning
applies — see `2026-08-01-disclosure-design.md`.

### D2 — This one *is* a client component

Unlike `Disclosure`, `Dialog` carries `'use client'`. `showModal()` is
imperative, and finding 3 says the estate opens dialogs from parent state and
from URL params.

**Invoker Commands** (`command="show-modal"` + `commandfor="dialog-id"`) were
considered. They are not limited to a colocated trigger — `commandfor` targets
any dialog by id, so they could drive the nav sheets too. What they cannot
express is synchronising with arbitrary React or URL state, and they provide no
`onClose` callback, which three of four usages need. Support is also newer than
anything the package currently requires. Revisit if a consumer lands a purely
declarative dialog.

What stays native regardless: the trap, the backdrop, Esc, inertness, focus
restore. The JavaScript reduces to syncing one prop and listening for close
requests.

### D3 — Controlled `open`, and a close protocol that does not loop

`open: boolean` plus `onRequestClose: () => void`, driven by the consumer. The
opposite of `Disclosure`'s uncontrolled decision, for the opposite reason:
finding 3 shows the open state is always owned by something else.

The naive design — listen for the native `close` event and call `onClose` —
feeds back on itself. Setting `open` to `false` makes the effect call
`dialog.close()`, which fires `close`, which would call the consumer back for a
closure the consumer just initiated. The protocol is therefore split:

- **`onRequestClose`** fires only for *user* close requests: the `cancel` event
  (Esc), an outside click, and `<form method="dialog">` submission. It is a
  request, not a notification — the consumer decides whether to honour it.
- The native `close` event is used **only** to resynchronise, never to call
  back. If the element closed while `open` is still `true`, the component
  reopens or reports state, rather than mutating consumer state.
- Both `showModal()` and `close()` are guarded on `dialog.open`. Calling
  `showModal()` on an already-open dialog throws `InvalidStateError`.

Esc is *policy*-enabled, not platform-forced: the `cancel` event is cancelable
and `closedby="none"` exists. The component deliberately does not expose a way
to suppress Esc.

No built-in trigger component. Consumers already have their own buttons.

### D4 — Outside-click dismissal is geometric, and named for what it does

The prop is `closeOnOutsideClick` (default `true`), not `dismissible` — it
governs outside clicks only, and a name implying it also covers Esc would be a
lie.

Detection cannot be `event.target === dialog`: `::backdrop` is not an event
target, so that test also matches clicks on the dialog's own padding. Compare
the pointer coordinates against `getBoundingClientRect()`, and pair
`pointerdown` with `pointerup` so a drag that starts inside the dialog and ends
outside does not close it.

### D5 — `placement` covers both shapes

`placement?: 'center' | 'end'` (default `center`). `end` means the logical
inline-end edge, so it flips under RTL rather than being hard-coded to the
right.

`size` means different things per placement — max-width for `center`, width for
`end` — and sheets additionally need a max-height with internal overflow so long
nav content scrolls inside the dialog rather than the page. Both are documented
rather than unified.

### D6 — Animation via `@starting-style`, degrading to instant

Open/close transitions need `transition-behavior: allow-discrete` on `display`
and `overlay`, plus `@starting-style` for the entry frame. **`::backdrop` needs
its own transition and its own `@starting-style`** — styling only the panel
leaves the backdrop popping in. Reuses `--duration-expand`, and
`prefers-reduced-motion` disables it. Where unsupported the dialog appears
instantly, which is correct and merely abrupt — the same fallback posture as
`Disclosure`.

### D7 — Scroll locking is best-effort and says so

The component sets `overflow: hidden` on `<html>` while open, ref-counted so
sibling dialogs do not fight, preserving and restoring any prior inline value,
and tolerant of React Strict Mode's double-invoked effects.

It does **not** promise scroll locking on iOS Safari, which has long-standing
and recently regressed behaviour here. Rather than ship a
position-fixed/scroll-restore hack — the usual workaround, which costs scroll
position bugs of its own — the limitation is documented. Revisit if a consumer
hits it in practice. Scrollbar-induced layout shift is likewise not compensated
in the first cut.

## API

```tsx
const [open, setOpen] = useState(false)

<Dialog open={open} onRequestClose={() => setOpen(false)} aria-labelledby="booking-title">
  <h2 id="booking-title">An welchem Standort möchten Sie einen Termin vereinbaren?</h2>
  …
  <button type="button" autoFocus onClick={() => setOpen(false)}>Abbrechen</button>
</Dialog>
```

`Dialog` extends `Omit<ComponentPropsWithRef<'dialog'>, 'open' | 'onClose' | 'children'>`;
unlisted props and `ref` land on the `<dialog>` root. The `Omit` is load-bearing —
native `open` and React's `onClose` would otherwise collide with the props below.

- `open: boolean` — required, controlled.
- `onRequestClose: () => void` — required. Esc, outside click, and
  `<form method="dialog">` submission, per D3.
- `children: ReactNode` — rendered directly, no wrapper (as `Disclosure` D6).
- `placement?: 'center' | 'end'`
- `size?: 'sm' | 'md' | 'lg'` — see D5 for what it means per placement.
- `closeOnOutsideClick?: boolean` (default `true`)
- `className?: string`

**Naming is the caller's job and is required**: supply either `aria-labelledby`
pointing at a heading in `children` (preferred — a visible title), or
`aria-label`. Both ride through the prop spread; the component adds neither, and
a heading with no `id` referenced by `aria-labelledby` names nothing.

Not included: a `Dialog.Trigger`, a portal prop (the top layer removes the
need), and a non-modal `show()` mode — nothing in the survey opens a non-modal
dialog.

## Accessibility

Beyond what `showModal()` gives (D1):

- **Initial focus is the caller's responsibility.** Document `autoFocus` on the
  least-destructive control, and `tabIndex={-1}` on a static container for long
  or structured content so focus does not land mid-dialog.
- **A visible close or cancel control is required**, not optional. Esc and
  outside-click are not discoverable and are unavailable to some input methods.
- Forced-colors mode, 200–400% zoom, and RTL placement are part of the manual
  check.
- A dialog with no focusable content at all needs a defined focus target;
  otherwise focus stays on `<body>` and the trap is meaningless.

## Tokens

Expected additions, to confirm during implementation: `--color-backdrop` for
`::backdrop` (the four implementations use `black/50`, `slate-800/60` and
`black/50`) and a max-width scale for `size`. `--duration-expand` is reused
rather than adding a dialog-specific duration.

## Testing

jsdom does not implement `showModal()`, `::backdrop` or the top layer, so the
Vitest surface is deliberately narrow, with the prototype methods spied:

- `open` toggling calls `showModal()` / `close()`, each guarded on `dialog.open`
  so neither is called twice.
- `cancel` and outside clicks invoke `onRequestClose`; a programmatic close does
  **not** (the D3 loop).
- `closeOnOutsideClick={false}` suppresses outside-click close but not Esc.
- A pointer drag starting inside and released outside does not close.
- Unlisted props and `ref` land on the root.
- The scroll lock is applied on open, ref-counted across two dialogs, and the
  prior inline value restored on close — including under Strict Mode double
  invocation, and when the component unmounts while open.

Everything else — focus trap, focus restore, inertness, `::backdrop`,
`@starting-style` — is Storybook plus the real-browser matrix.

## Risks and open questions

- **Browser/AT matrix is an approval gate**, as with `Disclosure`:
  `@starting-style` and `transition-behavior: allow-discrete` on both panel and
  backdrop, focus restoration after close, screen-reader announcement of the
  dialog name, forced colors, 200–400% zoom, RTL placement, rapid/interrupted
  open-close transitions, and hydration when `open` is `true` on first render.
- **iOS scroll locking is declined, not solved** (D7). If that proves
  unacceptable in a real consumer, it becomes a blocker with a specified
  fallback rather than a documented limitation.
- **Multiple sibling dialogs** share the ref-counted lock but are otherwise
  untested; nested dialogs are out of the first cut.
- **`returnValue`** from `<form method="dialog">` is not surfaced in the API.
  Add it when a consumer needs a result value rather than a boolean.
- **nuwa opens dialogs from URL params** and sets `noindex` while open. The
  component takes no position on routing; confirm during migration that a
  controlled `open` is enough.

## Non-goals

- Popover and Menu — separate components, own specs. `<dialog>` is the wrong
  primitive for both; the Popover API is.
- Non-modal dialogs, nested dialogs, and drag-to-dismiss sheets.
- A built-in trigger, and any opinion on routing or URL state.
