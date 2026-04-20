import {
  ThemePreviewDark,
  ThemePreviewLight,
  ThemePreviewSystem,
  useAuth,
  useSession,
} from '@better-auth-ui/react'
import { Monitor, Moon, Sun } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Field, FieldContent, FieldLabel, FieldTitle } from '@/components/ui/field'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { cn } from '@/lib/utils/cn'

export type AppearanceProps = {
  className?: string
}

/**
 * Renders a theme selector card with visual theme previews.
 *
 * Displays a card containing radio buttons for selecting between system, light,
 * and dark themes. Each option shows a visual preview of the theme. Only renders
 * if theme settings are configured (theme, setTheme, and themes are provided).
 *
 * @param className - Optional additional CSS class names for the card container.
 * @returns A JSX element containing the theme selector card, or null if theme settings are not configured.
 */
export function Appearance({ className }: AppearanceProps) {
  const {
    localization,
    appearance: { theme, setTheme, themes },
  } = useAuth()
  const { data: session } = useSession()

  return (
    <div>
      <h2 className="mb-3 text-sm font-semibold">{localization.settings.appearance}</h2>

      <Card className={cn(className)}>
        <CardContent>
          <Field>
            <Label>{localization.settings.theme}</Label>

            <RadioGroup
              value={session ? theme : ''}
              onValueChange={setTheme}
              className="grid grid-cols-2 gap-3 sm:grid-cols-3"
              disabled={!session || !theme}
            >
              {themes.includes('system') && (
                <FieldLabel htmlFor="system">
                  <Field orientation="horizontal">
                    <FieldContent className="gap-2">
                      <div className="flex items-center justify-between gap-2">
                        <FieldTitle>
                          <Monitor className="size-4 text-muted-foreground" />

                          {localization.settings.system}
                        </FieldTitle>

                        <RadioGroupItem value="system" id="system" />
                      </div>

                      <ThemePreviewSystem className="w-full" />
                    </FieldContent>
                  </Field>
                </FieldLabel>
              )}

              {themes.includes('light') && (
                <FieldLabel htmlFor="light">
                  <Field orientation="horizontal">
                    <FieldContent className="gap-2">
                      <div className="flex items-center justify-between gap-2">
                        <FieldTitle>
                          <Sun className="size-4 text-muted-foreground" />

                          {localization.settings.light}
                        </FieldTitle>

                        <RadioGroupItem value="light" id="light" />
                      </div>

                      <ThemePreviewLight className="w-full" />
                    </FieldContent>
                  </Field>
                </FieldLabel>
              )}

              {themes.includes('dark') && (
                <FieldLabel htmlFor="dark">
                  <Field orientation="horizontal">
                    <FieldContent className="gap-2">
                      <div className="flex items-center justify-between gap-2">
                        <FieldTitle>
                          <Moon className="size-4 text-muted-foreground" />

                          {localization.settings.dark}
                        </FieldTitle>

                        <RadioGroupItem value="dark" id="dark" />
                      </div>

                      <ThemePreviewDark className="w-full" />
                    </FieldContent>
                  </Field>
                </FieldLabel>
              )}
            </RadioGroup>
          </Field>
        </CardContent>
      </Card>
    </div>
  )
}
