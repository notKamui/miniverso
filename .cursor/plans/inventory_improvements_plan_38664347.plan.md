---
name: Inventory improvements plan
overview: 'Extend the inventory mini-app with: (1) auto-generated order references from persisted prefixes, with user-selected prefix at create; (2) searchable tag, production-cost, and product selects using the existing shadcn/base-ui Combobox (and refactor the time app TagSelector to Combobox); (3) mandatory SKU; (4) product archiving; (5) paginated, filterable overview and orders; (6) arbitrary date ranges with presets (orders, stats), including "last year".'
todos: []
isProject: false
---

# Inventory improvements (revised: Combobox, TagSelector)

## 1. Schema and migration

Unchanged from prior plan: **inventory_order_reference_prefix** table; **product.archivedAt**; **product.sku** enforced in app (optional DB backfill + NOT NULL). Migration `0006`, schema updates in [src/server/db/schema/inventory.ts](src/server/db/schema/inventory.ts).

---

## 2. Order reference prefixes (backend)

Unchanged: prefix CRUD, `$getNextOrderReference`, `$createOrder` with optional `reference` + required `prefixId` when auto-generating.

---

## 3. Order reference prefixes (UI)

Unchanged: Inventory Settings route for prefix CRUD; Order cart: prefix selector, remove free-text reference, optional `$getNextOrderReference` preview, `createMut({ data: { prefixId, ... } })`.

---

## 4. SKU mandatory

Unchanged: zod `sku` required; product form SKU `required`.

---

## 5. Searchable selects: use Combobox (no SearchableSelect)

Use the existing [Combobox](src/components/ui/combobox.tsx) from `@/components/ui/combobox` (Base UI–based, with `Combobox`, `ComboboxInput`, `ComboboxContent`, `ComboboxList`, `ComboboxItem`, `ComboboxCollection`, `ComboboxEmpty`; for multi-select: `ComboboxChips`, `ComboboxChip`, `ComboboxChipsInput`). **Do not add** `SearchableSelect`.

**Product form [src/components/apps/inventory/product-form.tsx](src/components/apps/inventory/product-form.tsx)**

- **Tags (multi-select):** Use **Combobox** with `multiple` (or multi-value), **ComboboxChips** as anchor, **ComboboxChipsInput** for typing, **ComboboxContent** + **ComboboxList** + **ComboboxItem** for options from `tags` (value `t.id`, label `t.name`). Filter by name: rely on Combobox’s built-in filtering, or restrict the list by `inputValue` (filter `tags` where `name` ilike `inputValue`). Keep “Create tag” via an `onCreate`-style handler or a button in **ComboboxEmpty** / beside the list that calls `$createInventoryTag` and appends to `tagIds` and options.
- **Production-cost rows:** Replace each label **Select** with a **Combobox** (single-select): **ComboboxInput** (or trigger) + **ComboboxContent** + **ComboboxList** + **ComboboxItem** over `labels` (value `l.id`, label `l.name`). Filter by name (built-in or manual). Keep “Create label” and “Add” row as today.

**Order cart [src/components/apps/inventory/order-cart.tsx](src/components/apps/inventory/order-cart.tsx)**

- **Prefix (single):** **Combobox** over `$getOrderReferencePrefixes` (value `p.id`, label `p.prefix` or `prefix`).
- **Product (single, async):** **Combobox** with options coming from `$getProducts({ data: { search: inputValue, archived: 'active', size: 50 } })`. Debounce input (e.g. 300ms), fetch, then render **ComboboxItem** from results (value `p.id`, label e.g. `{p.name} ({p.sku}) · stock: {p.quantity}`). If the Base UI Combobox assumes a static list, disable its default filter and drive **ComboboxItem** only from the fetched `products` state; show **ComboboxEmpty** when `products.length === 0` and not loading.

**Time app: TagSelector [src/components/apps/time/tag-selector.tsx](src/components/apps/time/tag-selector.tsx)**

- Refactor to use **Combobox**: replace the Popover + Input + manual filtered list with **Combobox** (single-select), **ComboboxInput**, **ComboboxContent**, **ComboboxList**, **ComboboxItem**. Options: `tags` with value `tag.id`, label `tag.description`. Rely on Combobox’s input to filter the list by `description`.
- **Per-tag delete:** Keep delete. Render a delete control (e.g. **Button** with `Trash2Icon`) inside or next to **ComboboxItem**; use `onClick={(e) => { e.stopPropagation(); handleDeleteTag(e, tag.id); }}` so choosing the tag still works. Alternatively, a small icon that only deletes, and select happens on the main row.
- **Empty state:** Reuse or adapt the current “No tags saved yet” / “No tags match your search” in **ComboboxEmpty** or as custom content when the list is empty.

---

## 6. Product archiving

Unchanged: `product.archivedAt`; `$updateProduct` with `archivedAt`; `$getProducts` with `archived` and `paginated`; `$createOrder` excludes archived products; Archive/Unarchive in product detail/form.

---

## 7. Overview: pagination and filters

Unchanged: `$getProducts` with `page`, `size`, `search`, `archived`; `validateSearch` and filters (q, archived); pagination; `productsPage.items` for DataTable.

---

## 8. Orders: pagination and filters

Unchanged: `$getOrders` with `page`, `size`, `reference`, `startDate`, `endDate` and custom pagination + `totalTaxIncluded`; `validateSearch`; filters (reference, `DateRangeSelect`); pagination.

---

## 9. Stats: arbitrary range + presets (incl. last year)

Unchanged: `Preset` + `lastYear`; `validateSearch` with `startDate`/`endDate` and `preset`; `DateRangeSelect` with presets; `getRange` for `lastYear`.

---

## 10. Date range UX (DateRangeSelect)

Unchanged: **DateRangeSelect** with presets and From/To; `getRange` including `lastYear`; use in Stats and Orders.

---

## 11. Files to add

- `src/server/db/schema` updates and `.drizzle/0006_*.sql` (unchanged).
- `src/components/ui/date-range-select.tsx` (unchanged).
- `src/routes/_authed/inventory/settings/route.tsx` (or `settings.tsx`) (unchanged).

**Remove** from prior plan: `src/components/ui/searchable-select.tsx`.

---

## 12. Files to modify

- [src/server/db/schema/inventory.ts](src/server/db/schema/inventory.ts) (unchanged).
- [src/server/functions/inventory.ts](src/server/functions/inventory.ts) (unchanged).
- [src/components/apps/inventory/product-form.tsx](src/components/apps/inventory/product-form.tsx): use **Combobox** for tags (multi) and production-cost labels (single per row); SKU required; Archive/Unarchive when `productId`.
- [src/components/apps/inventory/order-cart.tsx](src/components/apps/inventory/order-cart.tsx): **Combobox** for prefix and for product (async via `$getProducts`); remove reference input; `createMut` with `prefixId`.
- [src/routes/\_authed/inventory/index.tsx](src/routes/_authed/inventory/index.tsx) (unchanged).
- [src/routes/\_authed/inventory/orders/index.tsx](src/routes/_authed/inventory/orders/index.tsx) (unchanged).
- [src/routes/\_authed/inventory/stats.tsx](src/routes/_authed/inventory/stats.tsx) (unchanged).
- [src/components/app-sidebar.tsx](src/components/app-sidebar.tsx) (unchanged).
- [src/routes/\_authed/inventory/products/$productId.tsx](src/routes/_authed/inventory/products/$productId.tsx) (unchanged).
- **[src/components/apps/time/tag-selector.tsx](src/components/apps/time/tag-selector.tsx): **refactor to **Combobox** (single-select, filter by `description`), keep per-tag delete with `stopPropagation`.

---

## 13. Order of implementation

1. Migration and schema (unchanged).
2. Server: prefix CRUD, `$getNextOrderReference`, `$createOrder`; `$getProducts` paginated + search + archived; `$getOrders` paginated + filters; `$updateProduct` `archivedAt`; sku required; `$createOrder` exclude archived.
3. **DateRangeSelect** and `getRange` with `lastYear`.
4. **Use Combobox** (no new SearchableSelect):

- **Product form:** tags (ComboboxChips + multi), production-cost label (Combobox single per row); “Create tag” / “Create label” as now, wired into ComboboxEmpty or a side button.
- **Order cart:** prefix Combobox, product Combobox (async: debounced `$getProducts`).
- **TagSelector:** replace Popover+Input+list with Combobox; keep per-tag delete.

5. Inventory Settings and prefix CRUD UI; Order cart: remove reference, `createMut(prefixId)`, optional preview.
6. Overview: filters and pagination.
7. Orders: filters and pagination.
8. Stats: `DateRangeSelect`, presets, last year.

---

## 14. Combobox usage notes

- **Sync (tags, labels, prefix):** `options` from server; Combobox’s input filters the list (Base UI supports this). For multi (tags), use `ComboboxChips` + `ComboboxChipsInput` and multi-value.
- **Async (products in order-cart):** Debounce `inputValue`, call `$getProducts({ search, archived: 'active', size: 50 })`, store in `products` state; render **ComboboxItem** from `products`. If the Combobox has a `f
