import {
  columnSizingFeature,
  columnVisibilityFeature,
  metaHelper,
  tableFeatures,
} from '@tanstack/react-table'

export const dataTableFeatures = tableFeatures({
  columnSizingFeature,
  columnVisibilityFeature,
  columnMeta: metaHelper<{ stickyRight?: boolean; grow?: boolean }>(),
})

export type DataTableFeatures = typeof dataTableFeatures
