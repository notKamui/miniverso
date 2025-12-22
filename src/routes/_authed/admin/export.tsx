import { createFileRoute } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { text, title } from '@/components/ui/typography'
import { $adminExportV1 } from '@/server/functions/admin/export'

export const Route = createFileRoute('/_authed/admin/export')({
  loader: () => ({ crumb: 'Export' }),
  component: RouteComponent,
})

function RouteComponent() {
  const [isExporting, setIsExporting] = useState(false)
  const [includeTimeRecorder, setIncludeTimeRecorder] = useState(true)
  const [userEmail, setUserEmail] = useState('')
  const adminExportV1 = useServerFn($adminExportV1)

  const trimmedUserEmail = useMemo(() => userEmail.trim(), [userEmail])
  const effectiveUserEmail =
    trimmedUserEmail.length > 0 ? trimmedUserEmail : undefined

  async function downloadExport() {
    if (!includeTimeRecorder) {
      toast.error('Select at least one application to export')
      return
    }

    setIsExporting(true)
    try {
      const exportDoc = await adminExportV1({
        data: {
          apps: { timeRecorder: includeTimeRecorder },
          userEmail: effectiveUserEmail,
        },
      })

      const date = exportDoc.exportedAt.slice(0, 10)
      const scope = exportDoc.filters.userEmail
        ? `-${exportDoc.filters.userEmail}`
        : ''
      const filename = `miniverso-export-v${exportDoc.version}-${date}${scope}.json`

      const blob = new Blob([JSON.stringify(exportDoc, null, 2)], {
        type: 'application/json',
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)

      toast.success('Export downloaded')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Export failed')
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h3 className={title({ h: 3 })}>Export / Import</h3>
        <p className={text({ variant: 'muted' })}>
          Export application data for backup or migration.
        </p>
      </div>

      <div className="container flex flex-col gap-4 rounded-md border p-4">
        <div className="flex flex-col gap-2">
          <h4 className={title({ h: 4 })}>Applications</h4>
          <Label className="flex items-center gap-2">
            <Checkbox
              checked={includeTimeRecorder}
              onCheckedChange={(checked) =>
                setIncludeTimeRecorder(checked === true)
              }
            />
            <span>Time recorder</span>
          </Label>
        </div>

        <Separator />

        <div className="flex flex-col gap-2">
          <h4 className={title({ h: 4 })}>User scope</h4>
          <p className={text({ variant: 'muted' })}>
            Leave empty to export data for all users.
          </p>
          <div className="flex flex-col gap-2">
            <Label htmlFor="export-user-email">User email (optional)</Label>
            <Input
              id="export-user-email"
              type="email"
              value={userEmail}
              onChange={(e) => setUserEmail(e.target.value)}
              placeholder="user@example.com"
              autoComplete="email"
            />
          </div>
        </div>

        <Separator />

        <div className="flex items-center gap-2">
          <Button onClick={downloadExport} disabled={isExporting}>
            {isExporting ? 'Exporting…' : 'Download export'}
          </Button>
        </div>
      </div>
    </div>
  )
}
