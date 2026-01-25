Review and suggested improvements

1. Cash table: inputs can stay stale after update
   Inputs use defaultValue. After onBlur → $updateCash → invalidateQueries → refetch, rows updates but defaultValue is only used on mount, so the cell can still show the old value until the row remounts.
Fix: Remount the row when server data changes by making the key depend on the fields that can be updated, e.g.:
<TableRow key={`${row.id}-${row.label}-${String(row.value)}-${row.quantity}`}>
   That way, when the refetched row has new label/value/quantity, the row (and its inputs) remount with the new defaultValue.
2. Cash: delete without confirmation
   Delete is immediate. A short confirmation (e.g. window.confirm or a small modal) would reduce accidental removes, and matches common UX for “delete row” actions.
3. Cash: sortOrder exists but there’s no reorder UI
   Data is ordered by sortOrder and id, but users can’t change order. Ideas:
   Up/down buttons per row, or
   Drag-and-drop to update sortOrder via $updateCash.
4. Currency hardcoded to €
   Amounts are always shown as €. For later i18n or multi-currency:
   Add something like currency: 'EUR' in Inventory (or user) settings.
   Use a small formatMoney(amount, currency) (or formatMoney(amount) that reads the setting) and replace the €-suffix usage.
5. Tests for inventory
   There are no tests under test/ for inventory (products, orders, cash, stats). Adding tests for the main server functions ($getProducts, $createOrder, $getCash/$updateCash, stats) and, if you have them, for cart/order creation would help refactors and prevent regressions.
6. Minor / consistency
   Section: Stats use <Section title= description=>. The Cash page uses a plain h2 and table; wrapping it in Section with a short description would align it with the rest of the stats UI.
   crumb: Children (stats, settings, cash) return { crumb }; the index doesn’t. If the layout uses crumb for breadcrumbs, consider returning e.g. { crumb: 'Products' } from the index for consistency.

### Ideas to extend the app

Idea Notes
Cash ↔ orders / till reconciliation When marking an order as paid, optionally record “expected cash” (or card). Cash page could support a “reconcile with expected” view (e.g. by date or by order).
Currency setting As in §4: make the symbol (and one day the currency) configurable in Inventory or user settings.
Cash: duplicate row “Duplicate” on a denomination row to clone label, value, quantity.
Cash: preset (e.g. Euro) “Load Euro template” that inserts standard coins/notes.
Low-stock or alerts view Reuse the existing low-stock logic in a dedicated “Alerts” or “Dashboard” block.
Export (CSV/Excel) Export products, orders, or stats from Inventory (in addition to Admin export/import).
Barcode / QR for products Optional barcode on product and a scanner-friendly flow to add lines to the order cart.
Order → stock When an order is “paid”, decrement product.quantity (and optionally block if quantity < 0). Right now orders don’t seem to update stock.

### Summary

The branch adds a full inventory flow (products, orders, stats, settings, cash) with a clear structure and consistent patterns. The most concrete code changes to do soon:

1. Cash table: fix stale inputs with a key like key={${row.id}-${row.label}-${String(row.value)}-${row.quantity}} on each TableRow.
2. Cash delete: add a confirm step.
3. Tests: cover at least the main inventory server functions and, if possible, the order creation flow.

If you say which of these you want to adopt first (e.g. key fix + delete confirm, or reorder UI, or currency/tests), we can outline the exact edits file by file.
