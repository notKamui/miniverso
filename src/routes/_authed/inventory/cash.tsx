import { createFileRoute } from '@tanstack/react-router'
import { CashTable } from '@/components/apps/inventory/cash-table'
import { title } from '@/components/ui/typography'
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
    <div className="flex flex-col gap-6">
      <h2 className={title({ h: 2 })}>Cash</h2>
      <CashTable />
    </div>
  )
}
