---
name: Per-line mods persisted on order
overview: "Per-line, multiple price modifications with persistence: store modifications on each order item (new DB column), send them on create, and display them in the order detail view. Client cart stores modifications per item; submit sends both computed unit price and modifications; order view shows each line's modifications for review."
todos: []
isProject: false
---

# Per-line multiple price modifications (with persistence and order view)

## Scope

1. **Per-line, multiple mods** (as before): Each cart line has its own list of modifications applied in sequence; no global "Apply to all".
2. **Persist on order**: Store the list of modifications per order item in the DB so they survive after order creation.
3. **Review in order view**: Display each order item's modifications in [src/routes/authed/inventory/orders/$orderId.tsx](src/routes/_authed/inventory/orders/$orderId.tsx) (via [OrderDetail](src/components/apps/inventory/order-detail.tsx)).

---

## 1. Backend: persist modifications on order item

**Schema** ([src/server/db/schema/inventory.ts](src/server/db/schema/inventory.ts))

- Add to `order_item` a new column, e.g. `priceModifications`, type **JSONB**, nullable (or default `[]`).
- Store an array of `{ type: 'increase'|'decrease', kind: 'flat'|'relative', value: number }` in order (same shape as client `PriceModification`).
- Drizzle: use `jsonb('price_modifications').$type<Array<{ type: string; kind: string; value: number }>>()` and make it optional so existing rows are null.

**Migration**

- New Drizzle migration adding `price_modifications` JSONB to `order_item`.

**Create order** ([src/server/functions/inventory/orders.ts](src/server/functions/inventory/orders.ts))

- Extend `orderCreateSchema` items: add optional `modifications?: z.array(z.object({ type: z.enum(['increase','decrease']), kind: z.enum(['flat','relative']), value: z.number() }))`.
- When inserting each `order_item`, set `priceModifications` from `data.items[i].modifications` (JSON stringify if needed, or pass as-is if Drizzle accepts object). If absent or empty, set null or `[]`.
- Keep existing logic: `unitPriceTaxFree` / `unitPriceTaxIncluded` still computed and stored as today (client sends computed unit price; server can keep validating/storing it).

**Get order** ([src/server/functions/inventory/orders.ts](src/server/functions/inventory/orders.ts) – `$getOrder`)

- In the items select, add `priceModifications: orderItem.priceModifications` (or the actual column name).
- Return it on each item so the order detail UI can show it.

---

## 2. Client: per-line modifications (unchanged from prior plan)

- **CartItem**: add `modifications: PriceModification[]`; effective price = apply mods in sequence to base price.
- **Utils**: `applyModificationsToPrice(base, mods)`; `effectivePriceTaxFree(item)` uses `item.modifications`.
- **Submit payload**: for each item send `unitPriceTaxFree` (computed) and `modifications` (array) so the server can persist them.
- **Form**: add new items with `modifications: []`; remove global apply/clear; per-line UI: list of mods + "Add modification" (preset or custom) per row.
- **Order cart**: remove or repurpose global price modification section; totals computed from `effectivePriceTaxFree`; "Save as preset" from per-line flow if desired.

---

## 3. Submit payload: send modifications

- **[lib/forms/order-cart.ts](src/lib/forms/order-cart.ts)**: Extend submit schema so each item can include `modifications: z.array(z.object({ type: z.enum(['increase','decrease']), kind: z.enum(['flat','relative']), value: z.number() })).optional()`.
- **[order-cart-form.tsx](src/components/apps/inventory/order-cart/order-cart-form.tsx)**: When building submit data, for each item send `modifications: i.modifications?.length ? i.modifications : undefined` (and keep `unitPriceTaxFree` as computed).

---

## 4. Order view: show modifications

**Data**

- `$getOrder` already returns `items` with the new `priceModifications` field (array or null).

**[OrderDetail](src/components/apps/inventory/order-detail.tsx)**

- For each item, if `item.priceModifications` exists and has length > 0, display it in the Items table.
- Options: add a column "Modifications" with a compact list (e.g. "−15%, +2€"), or show under the product name as a small line (e.g. "Modifications: −15%, +2€"). Keep the existing Unit (incl. tax) and Line total columns; modifications are for review only.
- Format each mod the same way as in the cart (e.g. `−10%`, `+5.00` using the same helper as preset label).

---

## 5. Files to touch (summary)

| Area        | File                                                                                             | Change                                                                                                          |
| ----------- | ------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------- |
| Schema      | [src/server/db/schema/inventory.ts](src/server/db/schema/inventory.ts)                           | Add `priceModifications` JSONB to `order_item`.                                                                 |
| Migration   | New migration                                                                                    | Add column to `order_item`.                                                                                     |
| Server      | [src/server/functions/inventory/orders.ts](src/server/functions/inventory/orders.ts)             | Create: accept and store `modifications` per item. Get: select and return `priceModifications` per item.        |
| Client form | [src/lib/forms/order-cart.ts](src/lib/forms/order-cart.ts)                                       | Add optional `modifications` array to item schema.                                                              |
| Client cart | Types, utils, form, items list, (new) row/popover                                                | Per-line `modifications` array; add/remove mods per line; submit `modifications` + computed `unitPriceTaxFree`. |
| Order view  | [src/components/apps/inventory/order-detail.tsx](src/components/apps/inventory/order-detail.tsx) | For each item, show `priceModifications` when present (e.g. new column or line under product).                  |

---

## 6. Edge cases

- **Existing orders**: No `price_modifications` data; column nullable. Order detail only shows modifications when `item.priceModifications?.length > 0`.
- **Backward compatibility**: Create order still works if client sends only `unitPriceTaxFree` (no `modifications`); set `priceModifications` to null for those items.
- **Validation**: Server can validate that stored `unitPriceTaxFree` matches recomputing from product base + `modifications` when `modifications` is provided; optional consistency check.
