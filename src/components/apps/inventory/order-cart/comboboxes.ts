import { createCombobox } from '@/components/ui/combobox'
import type { Prefix, Preset, Product } from './types'

export const PrefixCombobox = createCombobox<Prefix>()
export const ProductCombobox = createCombobox<Product>()
export const PresetCombobox = createCombobox<Preset>()
