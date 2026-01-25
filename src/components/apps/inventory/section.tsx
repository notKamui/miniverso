import { ChevronDownIcon } from 'lucide-react'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { cn } from '@/lib/utils/cn'

type SettingsSectionProps = {
  title: string
  description?: React.ReactNode
  defaultOpen?: boolean
  collapsible?: boolean
  children: React.ReactNode
}

export function Section({
  title,
  description,
  defaultOpen = true,
  collapsible = true,
  children,
}: SettingsSectionProps) {
  return (
    <Collapsible defaultOpen={defaultOpen} className="group" disabled={!collapsible}>
      <CollapsibleTrigger asChild>
        <button
          type="button"
          className={cn(
            'flex w-full items-center justify-between rounded-md px-3 py-3 text-left transition-colors',
            collapsible && 'hover:bg-muted/50',
          )}
          disabled={!collapsible}
        >
          <div>
            <h3 className="text-base font-medium">{title}</h3>
            {description && <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>}
          </div>
          {collapsible && (
            <ChevronDownIcon className="size-4 shrink-0 transition-transform group-data-[state=open]:rotate-180" />
          )}
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="space-y-4 pt-2">{children}</div>
      </CollapsibleContent>
    </Collapsible>
  )
}
