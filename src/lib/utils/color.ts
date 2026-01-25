/**
 * Returns 'white' or '#171717' for readable text on a hex background.
 * Uses relative luminance: https://www.w3.org/TR/WCAG20-TECHS/G17.html
 */
export function contrastTextForHex(hex: string): string {
  const h = hex.replace(/^#/, '')
  const r = parseInt(h.length === 3 ? h[0]! + h[0]! : h.slice(0, 2), 16) / 255
  const g = parseInt(h.length === 3 ? h[1]! + h[1]! : h.slice(2, 4), 16) / 255
  const b = parseInt(h.length === 3 ? h[2]! + h[2]! : h.slice(4, 6), 16) / 255
  const L = 0.2126 * r + 0.7152 * g + 0.0722 * b
  return L > 0.4 ? '#171717' : 'white'
}
