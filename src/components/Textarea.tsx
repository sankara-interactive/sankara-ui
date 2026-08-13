import type { ComponentPropsWithoutRef, Ref } from 'react'
import { cn } from '../utilities/cn.js'
import { Field, type SharedFieldProps } from './Field.js'

export type TextareaProps = Omit<ComponentPropsWithoutRef<'textarea'>, 'id' | 'className'> &
  SharedFieldProps & {
    ref?: Ref<HTMLTextAreaElement>
  }

export function Textarea({
  name,
  label,
  id,
  description,
  error,
  className,
  fieldClassName,
  rows = 5,
  ...props
}: TextareaProps) {
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
        <textarea
          className={cn('sankara-field-control', className)}
          id={controlId}
          name={name}
          // Both structured projects independently chose 5.
          rows={rows}
          aria-describedby={describedBy}
          aria-invalid={invalid}
          {...props}
        />
      )}
    </Field>
  )
}
