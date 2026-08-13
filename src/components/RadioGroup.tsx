import type { ComponentPropsWithoutRef, ReactNode } from 'react'
import { cn } from '../utilities/cn.js'
import { fieldWiring, type SharedFieldProps } from './Field.js'

export type RadioGroupItem = {
  value: string
  label: ReactNode
  disabled?: boolean
}

export type RadioGroupProps = Omit<
  ComponentPropsWithoutRef<'fieldset'>,
  'id' | 'className' | 'children'
> &
  Omit<SharedFieldProps, 'fieldClassName'> & {
    items: RadioGroupItem[]
    defaultValue?: string
  }

/** The one control that cannot use Field: a radio group's accessible name comes
    from <legend> inside <fieldset>, not from <label for>. It shares the id
    derivation via fieldWiring and reuses the message classes, but owns its own
    wrapper markup. */
export function RadioGroup({
  name,
  label,
  id,
  description,
  error,
  className,
  items,
  defaultValue,
  ...props
}: RadioGroupProps) {
  const { id: groupId, describedBy, invalid, descriptionId, errorId } = fieldWiring({
    name,
    id,
    description,
    error,
  })

  return (
    <fieldset className={cn('sankara-field', className)} aria-describedby={describedBy} {...props}>
      <legend className="sankara-field-label">{label}</legend>
      {items.map(item => {
        const itemId = `${groupId}-${item.value}`
        return (
          <label className="sankara-field-radio-item" htmlFor={itemId} key={item.value}>
            <input
              className="sankara-field-radio"
              type="radio"
              id={itemId}
              name={name}
              value={item.value}
              defaultChecked={defaultValue === item.value}
              disabled={item.disabled}
              // Per radio, not on the fieldset: the radio role supports
              // aria-invalid unambiguously; group's support is not.
              aria-invalid={invalid}
            />
            <span>{item.label}</span>
          </label>
        )
      })}
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
    </fieldset>
  )
}
