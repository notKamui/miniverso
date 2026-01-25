import { ChevronDownIcon } from 'lucide-react'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'

type SettingsSectionProps = {
  title: string
  description?: React.ReactNode
  defaultOpen?: boolean
  children: React.ReactNode
}

export function SettingsSection({
  title,
  description,
  defaultOpen = true,
  children,
}: SettingsSectionProps) {
  return (
    <Collapsible defaultOpen={defaultOpen} className="group">
      <CollapsibleTrigger asChild>
        <button
          type="button"
          className="flex w-full items-center justify-between rounded-md py-2 text-left transition-colors hover:bg-muted/50"
        >
          <div>
            <h3 className="text-base font-medium">{title}</h3>
            {description && <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>}
          </div>
          <ChevronDownIcon className="size-4 shrink-0 transition-transform group-data-[state=open]:rotate-180" />
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="space-y-4 pt-2">{children}</div>
      </CollapsibleContent>
    </Collapsible>
  )
}
