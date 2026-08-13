import type { ComponentPropsWithoutRef, Ref } from 'react'
import { cn } from '../utilities/cn.js'
import { Field, type SharedFieldProps } from './Field.js'

export type CheckboxProps = Omit<
  ComponentPropsWithoutRef<'input'>,
  'id' | 'type' | 'className'
> &
  SharedFieldProps & {
    ref?: Ref<HTMLInputElement>
  }

export function Checkbox({
  name,
  label,
  id,
  description,
  error,
  className,
  fieldClassName,
  ...props
}: CheckboxProps) {
  return (
    // layout="inline" is the whole difference from Input -- a class, not a
    // second code path (D5). The DOM stays label -> control -> messages.
    <Field
      name={name}
      label={label}
      id={id}
      description={description}
      error={error}
      fieldClassName={fieldClassName}
      layout="inline"
    >
      {({ id: controlId, describedBy, invalid }) => (
        <input
          className={cn('sankara-field-checkbox', className)}
          type="checkbox"
          id={controlId}
          name={name}
          aria-describedby={describedBy}
          aria-invalid={invalid}
          {...props}
        />
      )}
    </Field>
  )
}
