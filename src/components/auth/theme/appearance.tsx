import {
  ThemePreviewDark,
  ThemePreviewLight,
  ThemePreviewSystem,
  useAuthPlugin,
} from '@better-auth-ui/react'
import { Monitor, Moon, Sun } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Field, FieldContent, FieldLabel, FieldTitle } from '@/components/ui/field'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { themePlugin } from '@/lib/auth/theme-plugin'
import { cn } from '@/lib/utils/cn'
import { useIsHydrated } from '../use-is-hydrated'

export type AppearanceProps = {
  className?: string
}

/**
 * Renders a theme selector card with visual theme previews.
 *
 * Displays a card containing radio buttons for selecting between system, light,
 * and dark themes. Each option shows a visual preview of the theme.
 *
 * @param className - Optional additional CSS class names for the card container.
 * @returns A JSX element containing the theme selector card.
 */
export function Appearance({ className }: AppearanceProps) {
  const { useTheme, localization } = useAuthPlugin(themePlugin)
  // oxlint-disable-next-line react-hooks-js/hooks
  const { theme, setTheme, themes = [] } = useTheme()

  const isHydrated = useIsHydrated()

  return (
    <div>
      <h2 className="mb-3 text-sm font-semibold">{localization.appearance}</h2>

      <Card className={cn(className)}>
        <CardContent>
          <Field>
            <FieldLabel>{localization.theme}</FieldLabel>

            <RadioGroup
              value={isHydrated ? theme : ''}
              onValueChange={setTheme}
              className="grid grid-cols-2 gap-3 sm:grid-cols-3"
              disabled={!isHydrated || !theme}
            >
              {themes.includes('system') && (
                <FieldLabel htmlFor="system">
                  <Field orientation="horizontal">
                    <FieldContent className="gap-2">
                      <div className="flex items-center justify-between gap-2">
                        <FieldTitle>
                          <Monitor className="size-4 text-muted-foreground" />

                          {localization.system}
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

                          {localization.light}
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

                          {localization.dark}
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
