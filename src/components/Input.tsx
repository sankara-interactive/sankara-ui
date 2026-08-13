import type { ComponentPropsWithoutRef, Ref } from 'react'
import { cn } from '../utilities/cn.js'
import { Field, type SharedFieldProps } from './Field.js'

/** checkbox and radio are excluded at the type level: they have their own
    components with structurally different markup, and <Input type="checkbox">
    would render a checkbox with a block label above it.

    A closed literal list, not `Exclude<ComponentPropsWithoutRef<'input'>['type'], 'checkbox' | 'radio'>`
    (the brief's original form): React's HTMLInputTypeAttribute ends in a
    `(string & {})` catch-all member (kept so arbitrary strings still
    type-check while literals still autocomplete). Exclude cannot remove a
    literal from a union that also carries a bare-string member -- 'checkbox'
    stays assignable through the catch-all, so the naive Exclude let
    `type="checkbox"` through silently. Verified via `yarn typecheck`: the
    `@ts-expect-error` below was reported as unused with the Exclude form.
    Trade-off: unlisted/future input types now need a raw <input>, not this
    component -- native HTML5 types are a fixed, well-known enumeration. */
type InputType =
  | 'button'
  | 'color'
  | 'date'
  | 'datetime-local'
  | 'email'
  | 'file'
  | 'hidden'
  | 'image'
  | 'month'
  | 'number'
  | 'password'
  | 'range'
  | 'reset'
  | 'search'
  | 'submit'
  | 'tel'
  | 'text'
  | 'time'
  | 'url'
  | 'week'

export type InputProps = Omit<
  ComponentPropsWithoutRef<'input'>,
  'type' | 'id' | 'className'
> &
  SharedFieldProps & {
    type?: InputType
    ref?: Ref<HTMLInputElement>
  }

export function Input({
  name,
  label,
  id,
  description,
  error,
  className,
  fieldClassName,
  ...props
}: InputProps) {
  return (
    <Field
      name={name}
      label={label}
      id={id}
      description={description}
      error={error}
      fieldClassName={fieldClassName}
    >
      {({ id: controlId, describedBy, invalid }) => (
        <input
          className={cn('sankara-field-control', className)}
          id={controlId}
          name={name}
          aria-describedby={describedBy}
          aria-invalid={invalid}
          // Last: a form library's own id/name/aria must win (D4).
          {...props}
        />
      )}
    </Field>
  )
}
