import { Input } from '@/components/ui/input'

type ColorInputProps = {
  id?: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

export function ColorInput({ id, value, onChange, placeholder = '#6b7280' }: ColorInputProps) {
  return (
    <div className="flex gap-1">
      <Input
        id={id}
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 w-14 cursor-pointer p-1"
      />
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-24 font-mono text-sm"
      />
    </div>
  )
}
