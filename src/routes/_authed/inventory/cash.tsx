import { createFileRoute } from '@tanstack/react-router'
import { CashTable } from '@/components/apps/inventory/cash-table'
import { Section } from '@/components/apps/inventory/section'
import { getCashQueryOptions } from '@/server/functions/inventory/cash'

export const Route = createFileRoute('/_authed/inventory/cash')({
  loader: async ({ context: { queryClient } }) => {
    await queryClient.ensureQueryData(getCashQueryOptions())
    return { crumb: 'Cash' }
  },
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <Section
      title="Cash"
      description="Track coins and bills by denomination; totals update automatically."
    >
      <CashTable />
    </Section>
  )
}
