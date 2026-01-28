---
name: super-product-bundles
overview: Add a "super product" (bundle) system where some products are groups of sub-products, and ordering a bundle correctly decrements the stock of its component products instead of or in addition to its own quantity.
todos:
  - id: schema-bundle-tables
    content: Extend inventory product schema with kind ('simple' | 'bundle') and add productBundleItem table
    status: completed
  - id: orders-bundle-expansion
    content: Implement bundle expansion helper and integrate it into $createOrder and $markOrderPaid for stock checks and deductions
    status: completed
  - id: product-form-bundles
    content: Extend product form schema and UI to configure bundle products and their component items
    status: completed
  - id: order-cart-bundle-ui
    content: Adjust order cart product display to handle bundles cleanly while still using the same payload
    status: completed
  - id: bundle-tests
    content: Add tests for creating, paying, and mixing bundle/simple products to verify stock behaviour
    status: completed
isProject: false
---

# Super product / bundle system

## 1. Data model & schema

- **Extend `product` type** in `[src/server/db/schema/inventory.ts](/Users/jteillard/Dev/miniverso/src/server/db/schema/inventory.ts)`:
  - Add a `kind` column (e.g. `text('kind', { enum: ['simple', 'bundle'] }).notNull().default('simple')`) to distinguish normal products from bundles.
  - Optionally, document that `quantity` is only meaningful for `kind = 'simple'`; for `kind = 'bundle'` it will generally stay `0` or unused.
- **Add bundle composition table** in the same schema file:
  - New table `productBundleItem` (or similar) with columns:
    - `id` (uuid primary key)
    - `bundleId` → references `product.id` (the parent/super product)
    - `productId` → references `product.id` (the component product)
    - `quantity` → integer (how many of this component per one bundle unit)
  - Add basic relations for `product` ↔ `productBundleItem` if needed for query helpers.
- **Migration**:
  - Add a new drizzle SQL migration (e.g. `0009_add_product_bundles.sql`) mirroring these changes.
  - Default all existing rows to `kind = 'simple'` and leave `productBundleItem` empty.

## 2. Server-side behaviour for orders

- **Bundle expansion helper** in `[src/server/functions/inventory/orders.ts](/Users/jteillard/Dev/miniverso/src/server/functions/inventory/orders.ts)`:
  - Add a pure helper function to expand an order’s line-items into **effective simple-product requirements**:
    - Input: `items: { productId: string; quantity: number }[]`.
    - Load all referenced products and bundle-composition rows in one or two queries.
    - For each item:
      - If product is `simple`, contribute `quantity` to that product.
      - If product is `bundle`, for each component row `{ productId: childId, quantity: qPerBundle }` add `quantity * qPerBundle` to the child’s required quantity.
    - Return a `Map<string, number>` / object mapping `productId -> requiredQuantity` for **simple** products only.
    - Guard against pathological cases (bundle containing a bundle); for a first version, either disallow this in validation or treat inner bundle components recursively only one level deep and document the constraint.
- **Update stock/validation in `$createOrder**`:
  - Today, `$createOrder` checks `data.items` directly against `product.quantity` when `status === 'paid'`.
  - Replace that logic to use the bundle expansion helper:
    - Build `requiredQuantities` from the helper.
    - Load just the **simple products** for those ids and ensure `product.quantity >= requiredQuantities[id]`.
    - On insufficient stock, throw the same `badRequest('Insufficient stock ...')` with the component product id.
- **Update stock deduction in `$createOrder` when status is `paid**`:
  - Currently, inside the transaction, it updates each ordered product’s `quantity` directly.
  - Change it to:
    - Call the same expansion helper to compute `requiredQuantities` for simple products.
    - For each `simpleProductId`, do `quantity = quantity - requiredQuantities[id]`.
    - Do **not** decrement quantity for bundle parent products themselves.
- **Update `$markOrderPaid**`:
  - Mark-paid currently:
    - Reads the order’s items and simple products.
    - Validates and deducts stock per product.
  - Refactor it to use the **same bundle expansion helper** + common stock-check and deduction logic so that marking a prepared bundle order as paid also deducts from components instead of bundles.

## 3. Stats and reporting

- **Keep stats computation unchanged (initially)** in `[src/server/functions/inventory/stats.ts](/Users/jteillard/Dev/miniverso/src/server/functions/inventory/stats.ts)`:
  - Orders stats currently filter `order.status === 'paid'` and work off `orderItem`/`product` revenue.
  - For now, leave these as-is so bundles are treated as separate SKUs for reporting, while stock handling is done based on components.
  - (Optional future enhancement) Add a follow-up migration/feature if you want stats that break down bundle sales into component-level consumption; keep that explicitly out of this change.

## 4. Product form UI: configure bundles

- **Types & values** in `[src/components/apps/inventory/product-form/types.ts](/Users/jteillard/Dev/miniverso/src/components/apps/inventory/product-form/types.ts)` and `[src/lib/forms/product.ts](/Users/jteillard/Dev/miniverso/src/lib/forms/product.ts)`:
  - Extend `productFormSchema` and `ProductFormValues`/`ProductFormPayload` with:
    - `kind: 'simple' | 'bundle'`
    - `bundleItems?: { productId: string; quantity: string | number }[]` (string in form, number in payload)
  - For `kind === 'bundle'`, allow/require `bundleItems` with at least one row and ignore `quantity` for the product itself (or require it to be zero).
- **Product form layout** (`index.tsx` + new subcomponent):
  - Add a toggle or radio group to choose between **Simple product** and **Bundle of products**.
  - Only show the stock `quantity` input when `kind === 'simple'`.
  - Add a new subcomponent `ProductFormBundleItems` that:
    - Uses TanStack Form (`form.Field` with `mode="array"`) to manage `bundleItems`.
    - Each row lets you pick a child product (combobox of existing products, excluding the current product) and set a quantity.
    - Provides add/remove row buttons similar to production costs.
- **Persist bundle configuration**:
  - In product create/update server functions (`$createProduct`, `$updateProduct` in `[src/server/functions/inventory/products.ts](/Users/jteillard/Dev/miniverso/src/server/functions/inventory/products.ts)`):
    - Accept `kind` and `bundleItems` in the validated payload.
    - Within the transaction, after upserting the main product row:
      - If `kind === 'bundle'`, upsert `productBundleItem` rows for that product (clear previous then insert current configuration).
      - If `kind === 'simple'`, clear any existing `productBundleItem` rows for that product.

## 5. Order creation UI behaviour

- **Order cart** (`[src/components/apps/inventory/order-cart.tsx](/Users/jteillard/Dev/miniverso/src/components/apps/inventory/order-cart.tsx)`):
  - Ensure the product search list includes both simple and bundle products; bundles behave like normal SKUs from the user’s perspective (priced by the bundle product fields).
  - When showing stock in the combobox label (currently `stock: ${p.quantity}`):
    - For simple products, keep using `p.quantity`.
    - For bundles, either:
      - Omit the stock figure (e.g. `· bundle`) or
      - Optionally compute a **theoretical max stock** from components (min over child `quantity / qPerBundle`) as a future enhancement.
  - No special handling is needed in the cart payload: still send `{ productId, quantity }`. The server now knows how to expand bundles when validating and deducting stock.

## 6. Constraints & validation

- **Prevent invalid bundle definitions**:
  - In the server schema for `bundleItems` validation:
    - Disallow referencing the same product as both bundle parent and component (no self-bundling).
    - Optionally disallow bundles of bundles in the first version by validating that all components have `kind === 'simple'`; this keeps expansion logic and stock reasoning simple.
  - In the product form UI, enforce a minimum of one `bundleItems` row when `kind === 'bundle'` (and show a validation message if empty on submit).

## 7. Testing

- **Unit/integration tests** (where you already have tests under `test/server` and `test/routes`):
  - Add tests for `$createOrder` and `$markOrderPaid` around bundles:
    - Creating and paying an order with a simple product still behaves exactly as before.
    - Creating and paying an order with a bundle product deducts only from component products, and fails when one component does not have enough stock.
    - Mixed orders (simple product + bundle sharing a component) deduct the sum of their requirements.
  - Add tests for product create/update to ensure bundle configuration is persisted and updated correctly.

This plan keeps the **bundle / super product** concept mostly a server-side concern for stock management and configuration, while the order/cart UI continues to treat bundles as normal SKUs with a richer product form for defining their composition.
