import { createFileRoute } from '@tanstack/react-router'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { text, title } from '@/components/ui/typography'

export const Route = createFileRoute('/_authed/admin/export')({
  loader: () => ({ crumb: 'Export' }),
  component: RouteComponent,
})

function RouteComponent() {
  const [isExporting, setIsExporting] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [includeTimeRecorder, setIncludeTimeRecorder] = useState(true)
  const [userEmail, setUserEmail] = useState('')
  const [importFile, setImportFile] = useState<File | null>(null)

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
      const url = new URL('/api/admin/export', window.location.origin)
      if (includeTimeRecorder) url.searchParams.append('apps', 'timeRecorder')
      if (effectiveUserEmail)
        url.searchParams.set('userEmail', effectiveUserEmail)

      const a = document.createElement('a')
      a.href = url.toString()
      document.body.appendChild(a)
      a.click()
      a.remove()

      toast.success('Download started')
    } finally {
      setIsExporting(false)
    }
  }

  async function importData() {
    if (!includeTimeRecorder) {
      toast.error('Select at least one application to import')
      return
    }
    if (!importFile) {
      toast.error('Select a file to import')
      return
    }

    setIsImporting(true)
    try {
      const url = new URL('/api/admin/import', window.location.origin)
      if (includeTimeRecorder) url.searchParams.append('apps', 'timeRecorder')

      const res = await fetch(url.toString(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-ndjson',
        },
        body: importFile,
      })

      if (!res.ok) {
        const text = await res.text()
        try {
          const parsed = JSON.parse(text) as { error?: string }
          toast.error(parsed.error || 'Import failed')
        } catch {
          toast.error(text || 'Import failed')
        }
        return
      }

      const summary = (await res.json()) as {
        processedLines?: number
        importedTimeEntries?: number
        skippedUnknownUser?: number
      }

      const processed = summary.processedLines ?? 0
      const imported = summary.importedTimeEntries ?? 0
      const skipped = summary.skippedUnknownUser ?? 0

      toast.success(
        `Import done: ${imported} imported, ${skipped} skipped, ${processed} lines processed`,
      )
    } finally {
      setIsImporting(false)
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

        <Separator />

        <div className="flex flex-col gap-2">
          <h4 className={title({ h: 4 })}>Import</h4>
          <p className={text({ variant: 'muted' })}>
            Upload a previous export file. Entries with unknown users are
            ignored.
          </p>

          <div className="flex flex-col gap-2">
            <Label htmlFor="import-file">Export file (.ndjson)</Label>
            <Input
              id="import-file"
              type="file"
              accept=".ndjson,application/x-ndjson"
              onChange={(e) => setImportFile(e.target.files?.[0] ?? null)}
            />
          </div>

          <div className="flex items-center gap-2">
            <Button onClick={importData} disabled={isImporting}>
              {isImporting ? 'Importing…' : 'Import'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
