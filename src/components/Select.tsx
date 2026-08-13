import type { ComponentPropsWithoutRef, Ref } from 'react'
import { cn } from '../utilities/cn.js'
import { Field, type SharedFieldProps } from './Field.js'

/** Children, not an `items` array, and no `placeholder` prop: <option> and
    <optgroup> are the native API and handle grouping for free, and a
    placeholder is <option value="">. RadioGroup takes `items` because radios
    have no equivalent native container -- the asymmetry tracks the platform. */
export type SelectProps = Omit<ComponentPropsWithoutRef<'select'>, 'id' | 'className'> &
  SharedFieldProps & {
    ref?: Ref<HTMLSelectElement>
  }

export function Select({
  name,
  label,
  id,
  description,
  error,
  className,
  fieldClassName,
  children,
  ...props
}: SelectProps) {
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
        <select
          className={cn('sankara-field-control', className)}
          id={controlId}
          name={name}
          aria-describedby={describedBy}
          aria-invalid={invalid}
          {...props}
        >
          {children}
        </select>
      )}
    </Field>
  )
}
