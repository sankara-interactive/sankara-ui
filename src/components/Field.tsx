import type { ReactNode } from 'react'
import { cn } from '../utilities/cn.js'

export type FieldWiring = {
  id: string
  describedBy: string | undefined
  invalid: true | undefined
}

/** The props every control in this package shares. `className` targets the
    control element; `fieldClassName` targets the wrapper. Splitting them is
    what fairmed.ch-sb's `containerClassName` was reaching for -- one prop
    cannot mean both, and the control is the far more common target. */
export type SharedFieldProps = {
  name: string
  label: ReactNode
  id?: string
  description?: ReactNode
  error?: ReactNode
  className?: string
  fieldClassName?: string
}

export type FieldProps = Omit<SharedFieldProps, 'className'> & {
  layout?: 'stacked' | 'inline'
  children: (wiring: FieldWiring) => ReactNode
}

/** Exported so each control derives ids identically, and so RadioGroup -- which
    cannot use Field, because its name comes from <legend> -- still shares the
    derivation rather than reimplementing it. */
export function fieldWiring({
  name,
  id,
  description,
  error,
}: Pick<SharedFieldProps, 'name' | 'id' | 'description' | 'error'>): FieldWiring & {
  descriptionId: string
  errorId: string
} {
  // No useId: that is a client-only hook and these are server components (D2).
  // Ceiling: two forms on one page sharing a field name collide -- pass `id`.
  const resolvedId = id ?? name
  const descriptionId = `${resolvedId}-description`
  const errorId = `${resolvedId}-error`
  const describedBy =
    [description ? descriptionId : null, error ? errorId : null].filter(Boolean).join(' ') ||
    undefined

  return {
    id: resolvedId,
    describedBy,
    invalid: error ? true : undefined,
    descriptionId,
    errorId,
  }
}

export function Field({
  name,
  label,
  id,
  description,
  error,
  fieldClassName,
  layout = 'stacked',
  children,
}: FieldProps) {
  const { descriptionId, errorId, ...wiring } = fieldWiring({ name, id, description, error })

  return (
    <div
      className={cn(
        'sankara-field',
        layout === 'inline' && 'sankara-field-inline',
        fieldClassName
      )}
    >
      <label className="sankara-field-label" htmlFor={wiring.id}>
        {label}
      </label>
      {children(wiring)}
      {description ? (
        <p className="sankara-field-description" id={descriptionId}>
          {description}
        </p>
      ) : null}
      {error ? (
        <p className="sankara-field-error" id={errorId}>
          {error}
        </p>
      ) : null}
    </div>
  )
}
