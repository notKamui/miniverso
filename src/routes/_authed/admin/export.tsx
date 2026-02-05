import { createFileRoute } from '@tanstack/react-router'
import { useMemo, useRef, useState } from 'react'
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
  const [includeTimeRecorder, setIncludeTimeRecorder] = useState(true)
  const [includeInventory, setIncludeInventory] = useState(false)
  const [userEmail, setUserEmail] = useState('')
  const [importFile, setImportFile] = useState<File | null>(null)
  const importInputRef = useRef<HTMLInputElement | null>(null)

  const trimmedUserEmail = useMemo(() => userEmail.trim(), [userEmail])
  const effectiveUserEmail = trimmedUserEmail.length > 0 ? trimmedUserEmail : undefined

  const { isExporting, downloadExport } = useExportDownload({
    includeTimeRecorder,
    includeInventory,
    userEmail: effectiveUserEmail,
  })

  const { isImporting, importData } = useImportNdjson({
    includeTimeRecorder,
    includeInventory,
    importFile,
  })

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
              onCheckedChange={(checked) => setIncludeTimeRecorder(checked === true)}
            />
            <span>Time recorder</span>
          </Label>
          <Label className="flex items-center gap-2">
            <Checkbox
              checked={includeInventory}
              onCheckedChange={(checked) => setIncludeInventory(checked === true)}
            />
            <span>Inventory</span>
          </Label>
        </div>

        <Separator />

        <div className="flex flex-col gap-2">
          <h4 className={title({ h: 4 })}>User scope</h4>
          <p className={text({ variant: 'muted' })}>Leave empty to export data for all users.</p>
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
            Choose a previous export file from your device (.ndjson). Check the same application(s)
            that were included in the export. Entries for users that don’t exist in this environment
            are skipped (inventory products may be assigned to you).
          </p>

          <div className="flex flex-col gap-2">
            <Label htmlFor="import-file">Export file (.ndjson)</Label>
            <Input
              ref={importInputRef}
              id="import-file"
              type="file"
              accept=".ndjson,application/x-ndjson,application/ndjson"
              className="hidden"
              onChange={(e) => setImportFile(e.target.files?.[0] ?? null)}
            />
            <div className="flex items-center gap-3 rounded-md border bg-background p-3">
              <Button
                type="button"
                variant="secondary"
                onClick={() => importInputRef.current?.click()}
                disabled={isImporting}
              >
                Choose file
              </Button>
              <div className="min-w-0 flex-1">
                <p className={text({ variant: 'muted' })}>
                  {importFile ? importFile.name : 'No file selected'}
                </p>
              </div>
              {importFile ? (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setImportFile(null)
                    if (importInputRef.current) {
                      importInputRef.current.value = ''
                    }
                  }}
                  disabled={isImporting}
                >
                  Clear
                </Button>
              ) : null}
            </div>
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

function parseErrorMessage(text: string) {
  try {
    const parsed = JSON.parse(text) as { error?: string }
    return parsed.error || text
  } catch {
    return text
  }
}

function useExportDownload(args: {
  includeTimeRecorder: boolean
  includeInventory: boolean
  userEmail?: string
}) {
  const { includeTimeRecorder, includeInventory, userEmail } = args
  const [isExporting, setIsExporting] = useState(false)

  function downloadExport() {
    if (!includeTimeRecorder && !includeInventory) {
      toast.error('Select at least one application to export')
      return
    }

    setIsExporting(true)
    try {
      const url = new URL('/api/admin/export', location.origin)
      if (includeTimeRecorder) url.searchParams.append('apps', 'timeRecorder')
      if (includeInventory) url.searchParams.append('apps', 'inventory')
      if (userEmail) url.searchParams.set('userEmail', userEmail)

      const a = document.createElement('a')
      a.href = url.toString()
      document.body.append(a)
      a.click()
      a.remove()

      toast.success('Download started')
    } finally {
      setIsExporting(false)
    }
  }

  return { isExporting, downloadExport }
}

function useImportNdjson(args: {
  includeTimeRecorder: boolean
  includeInventory: boolean
  importFile: File | null
}) {
  const { includeTimeRecorder, includeInventory, importFile } = args
  const [isImporting, setIsImporting] = useState(false)

  async function importData() {
    if (!includeTimeRecorder && !includeInventory) {
      toast.error('Select at least one application to import')
      return
    }
    if (!importFile) {
      toast.error('Select a file to import')
      return
    }

    setIsImporting(true)
    try {
      const url = new URL('/api/admin/import', location.origin)
      if (includeTimeRecorder) url.searchParams.append('apps', 'timeRecorder')
      if (includeInventory) url.searchParams.append('apps', 'inventory')

      const res = await fetch(url.toString(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-ndjson',
        },
        body: importFile,
      })

      if (!res.ok) {
        const text = await res.text()
        toast.error(parseErrorMessage(text) || 'Import failed')
        return
      }

      const summary = (await res.json()) as {
        processedLines?: number
        importedTimeEntries?: number
        importedInventoryProducts?: number
        skippedUnknownUser?: number
      }

      const processed = summary.processedLines ?? 0
      const importedTime = summary.importedTimeEntries ?? 0
      const importedInventory = summary.importedInventoryProducts ?? 0
      const skipped = summary.skippedUnknownUser ?? 0

      toast.success(
        `Import done: ${importedTime} time entries, ${importedInventory} inventory products, ${skipped} skipped, ${processed} lines processed`,
      )
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Import failed (network or server error)',
      )
    } finally {
      setIsImporting(false)
    }
  }

  return { isImporting, importData }
}
