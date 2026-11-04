import { useEffect, useId, useRef } from 'react'
import type { Vector3Tuple } from '../../scene/sceneConfig'
import type { NumericRange } from '../../scene/sceneLimits'

function decimalsForStep(step: number): number {
  if (step >= 1) {
    return 0
  }
  if (step >= 0.1) {
    return 1
  }
  if (step >= 0.01) {
    return 2
  }
  return 3
}

function defaultFormat(value: number, step: number): string {
  return value.toFixed(decimalsForStep(step))
}

interface SliderFieldProps {
  label: string
  value: number
  range: NumericRange
  step: number
  onChange: (value: number) => void
  format?: (value: number) => string
}

export function SliderField({ label, value, range, step, onChange, format }: SliderFieldProps) {
  const { minimum, maximum } = range
  const id = useId()
  const display = (format ?? ((current: number) => defaultFormat(current, step)))(value)

  return (
    <div className="field field--slider">
      <div className="field__row">
        <label htmlFor={id}>{label}</label>
        <output htmlFor={id} className="field__value" aria-hidden="true">
          {display}
        </output>
      </div>
      <input
        id={id}
        type="range"
        min={minimum}
        max={maximum}
        step={step}
        value={value}
        aria-valuetext={display}
        onChange={(event) => {
          const next = event.currentTarget.valueAsNumber
          if (Number.isFinite(next)) {
            onChange(next)
          }
        }}
      />
    </div>
  )
}

interface NumberFieldProps {
  label: string
  value: number
  minimum: number
  maximum: number
  step: number
  onChange: (value: number) => void
}

function formatDraft(value: number): string {
  return Number.parseFloat(value.toFixed(4)).toString()
}

export function NumberField({ label, value, minimum, maximum, step, onChange }: NumberFieldProps) {
  const id = useId()
  const inputRef = useRef<HTMLInputElement>(null)

  // Keep the uncontrolled draft in sync when another control changes the
  // value, such as a canvas camera drag. Typing itself does not commit.
  useEffect(() => {
    const input = inputRef.current
    if (input) {
      input.value = formatDraft(value)
    }
  }, [value])

  const commit = (input: HTMLInputElement) => {
    const parsed = input.valueAsNumber
    if (!Number.isFinite(parsed)) {
      input.value = formatDraft(value)
      return
    }

    const clamped = Math.min(maximum, Math.max(minimum, parsed))
    input.value = formatDraft(clamped)
    if (clamped !== value) {
      onChange(clamped)
    }
  }

  return (
    <div className="field field--number">
      <label htmlFor={id}>{label}</label>
      <input
        ref={inputRef}
        id={id}
        type="number"
        inputMode="decimal"
        min={minimum}
        max={maximum}
        step={step}
        defaultValue={formatDraft(value)}
        onBlur={(event) => commit(event.currentTarget)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault()
            commit(event.currentTarget)
            event.currentTarget.blur()
          } else if (event.key === 'Escape') {
            event.currentTarget.value = formatDraft(value)
            event.currentTarget.blur()
          }
        }}
      />
    </div>
  )
}

interface Vector3FieldProps {
  label: string
  value: Vector3Tuple
  minimum: number
  maximum: number
  step: number
  onChange: (value: Vector3Tuple) => void
}

const AXES = ['X', 'Y', 'Z'] as const

export function Vector3Field({
  label,
  value,
  minimum,
  maximum,
  step,
  onChange,
}: Vector3FieldProps) {
  return (
    <fieldset className="vector-field">
      <legend>{label}</legend>
      <div className="vector-field__inputs">
        {AXES.map((axis, index) => (
          <NumberField
            key={axis}
            label={axis}
            value={value[index]}
            minimum={minimum}
            maximum={maximum}
            step={step}
            onChange={(nextValue) => {
              const next: [number, number, number] = [value[0], value[1], value[2]]
              next[index] = nextValue
              onChange(next)
            }}
          />
        ))}
      </div>
    </fieldset>
  )
}

interface ColorFieldProps {
  label: string
  value: string
  onChange: (value: string) => void
}

export function ColorField({ label, value, onChange }: ColorFieldProps) {
  const id = useId()

  return (
    <div className="field field--color">
      <label htmlFor={id}>{label}</label>
      <span className="color-control">
        <input
          id={id}
          type="color"
          value={value}
          onChange={(event) => onChange(event.currentTarget.value)}
        />
        <span className="color-control__value" aria-hidden="true">
          {value.toUpperCase()}
        </span>
      </span>
    </div>
  )
}

interface SelectOption<T extends string> {
  readonly value: T
  readonly label: string
}

interface SelectFieldProps<T extends string> {
  label: string
  value: T
  options: readonly SelectOption<T>[]
  onChange: (value: T) => void
}

export function SelectField<T extends string>({
  label,
  value,
  options,
  onChange,
}: SelectFieldProps<T>) {
  const id = useId()

  return (
    <div className="field field--select">
      <label htmlFor={id}>{label}</label>
      <select
        id={id}
        value={value}
        onChange={(event) => {
          const next = options.find((option) => option.value === event.currentTarget.value)
          if (next) {
            onChange(next.value)
          }
        }}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  )
}

interface ToggleFieldProps {
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
}

export function ToggleField({ label, checked, onChange }: ToggleFieldProps) {
  const id = useId()

  return (
    <div className="field field--toggle">
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.currentTarget.checked)}
      />
    </div>
  )
}
