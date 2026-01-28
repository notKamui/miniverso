import { type InferSelectModel, relations } from 'drizzle-orm'
import {
  index,
  integer,
  numeric,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core'
import { user } from '@/server/db/schema/auth'

const money = { precision: 10, scale: 2 } as const

export const inventoryOrderReferencePrefix = pgTable(
  'inventory_order_reference_prefix',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    prefix: text('prefix').notNull(),
  },
  (table) => [
    index('inventory_order_reference_prefix_userId_idx').on(table.userId),
    unique().on(table.userId, table.prefix),
  ],
)
export type InventoryOrderReferencePrefix = InferSelectModel<typeof inventoryOrderReferencePrefix>

export const inventoryTag = pgTable(
  'inventory_tag',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    color: text('color').notNull(),
  },
  (table) => [
    index('inventory_tag_userId_idx').on(table.userId),
    index('inventory_tag_userId_name_idx').on(table.userId, table.name),
  ],
)
export type InventoryTag = InferSelectModel<typeof inventoryTag>

export const inventoryProductionCostLabel = pgTable(
  'inventory_production_cost_label',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    color: text('color').notNull(),
  },
  (table) => [
    index('inventory_production_cost_label_userId_idx').on(table.userId),
    index('inventory_production_cost_label_userId_name_idx').on(table.userId, table.name),
  ],
)
export type InventoryProductionCostLabel = InferSelectModel<typeof inventoryProductionCostLabel>

export const product = pgTable(
  'product',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    description: text('description'),
    sku: text('sku'),
    priceTaxFree: numeric('price_tax_free', money).notNull(),
    vatPercent: numeric('vat_percent', { precision: 5, scale: 2 }).notNull(),
    quantity: integer('quantity').notNull().default(0),
    archivedAt: timestamp('archived_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    index('product_userId_idx').on(table.userId),
    index('product_userId_archivedAt_idx').on(table.userId, table.archivedAt),
  ],
)
export type Product = InferSelectModel<typeof product>

export const productTag = pgTable(
  'product_tag',
  {
    productId: uuid('product_id')
      .notNull()
      .references(() => product.id, { onDelete: 'cascade' }),
    tagId: uuid('tag_id')
      .notNull()
      .references(() => inventoryTag.id, { onDelete: 'cascade' }),
  },
  (table) => [
    primaryKey({ columns: [table.productId, table.tagId] }),
    index('product_tag_productId_idx').on(table.productId),
  ],
)
export type ProductTag = InferSelectModel<typeof productTag>

export const productProductionCost = pgTable(
  'product_production_cost',
  {
    productId: uuid('product_id')
      .notNull()
      .references(() => product.id, { onDelete: 'cascade' }),
    productionCostLabelId: uuid('production_cost_label_id')
      .notNull()
      .references(() => inventoryProductionCostLabel.id, { onDelete: 'cascade' }),
    amount: numeric('amount', money).notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.productId, table.productionCostLabelId] }),
    index('product_production_cost_productId_idx').on(table.productId),
  ],
)
export type ProductProductionCost = InferSelectModel<typeof productProductionCost>

export const order = pgTable(
  'order',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    reference: text('reference').notNull(),
    status: text('status', { enum: ['prepared', 'sent', 'paid'] }).notNull(),
    description: text('description'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    paidAt: timestamp('paid_at'),
  },
  (table) => [
    index('order_userId_idx').on(table.userId),
    unique().on(table.userId, table.reference),
  ],
)
export type Order = InferSelectModel<typeof order>

export const orderItem = pgTable(
  'order_item',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orderId: uuid('order_id')
      .notNull()
      .references(() => order.id, { onDelete: 'cascade' }),
    productId: uuid('product_id')
      .notNull()
      .references(() => product.id, { onDelete: 'restrict' }),
    quantity: integer('quantity').notNull(),
    unitPriceTaxFree: numeric('unit_price_tax_free', money).notNull(),
    unitPriceTaxIncluded: numeric('unit_price_tax_included', money).notNull(),
  },
  (table) => [index('order_item_orderId_idx').on(table.orderId)],
)
export type OrderItem = InferSelectModel<typeof orderItem>

export const inventorySetting = pgTable(
  'inventory_setting',
  {
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    key: text('key').notNull(),
    value: text('value').notNull(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.key] })],
)

export type InventorySetting = InferSelectModel<typeof inventorySetting>

export const inventoryCash = pgTable(
  'inventory_cash',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    label: text('label').notNull(),
    value: numeric('value', money).notNull(),
    quantity: integer('quantity').notNull().default(0),
    sortOrder: integer('sort_order').notNull().default(0),
  },
  (table) => [index('inventory_cash_userId_idx').on(table.userId)],
)
export type InventoryCash = InferSelectModel<typeof inventoryCash>

export const userRelations_inventoryOrderReferencePrefix = relations(user, ({ many }) => ({
  orderReferencePrefixes: many(inventoryOrderReferencePrefix),
}))

export const userRelations_inventorySetting = relations(user, ({ many }) => ({
  inventorySettings: many(inventorySetting),
}))

export const inventorySettingRelations = relations(inventorySetting, ({ one }) => ({
  user: one(user, {
    fields: [inventorySetting.userId],
    references: [user.id],
  }),
}))

export const userRelations_inventoryCash = relations(user, ({ many }) => ({
  inventoryCash: many(inventoryCash),
}))

export const inventoryCashRelations = relations(inventoryCash, ({ one }) => ({
  user: one(user, {
    fields: [inventoryCash.userId],
    references: [user.id],
  }),
}))

export const inventoryOrderReferencePrefixRelations = relations(
  inventoryOrderReferencePrefix,
  ({ one }) => ({
    user: one(user, {
      fields: [inventoryOrderReferencePrefix.userId],
      references: [user.id],
    }),
  }),
)

export const userRelations_inventoryTag = relations(user, ({ many }) => ({
  inventoryTags: many(inventoryTag),
}))

export const inventoryTagRelations = relations(inventoryTag, ({ one, many }) => ({
  user: one(user, {
    fields: [inventoryTag.userId],
    references: [user.id],
  }),
  productTags: many(productTag),
}))

export const userRelations_inventoryProductionCostLabel = relations(user, ({ many }) => ({
  inventoryProductionCostLabels: many(inventoryProductionCostLabel),
}))

export const inventoryProductionCostLabelRelations = relations(
  inventoryProductionCostLabel,
  ({ one, many }) => ({
    user: one(user, {
      fields: [inventoryProductionCostLabel.userId],
      references: [user.id],
    }),
    productProductionCosts: many(productProductionCost),
  }),
)

export const userRelations_product = relations(user, ({ many }) => ({
  products: many(product),
}))

export const productRelations = relations(product, ({ one, many }) => ({
  user: one(user, {
    fields: [product.userId],
    references: [user.id],
  }),
  productTags: many(productTag),
  productProductionCosts: many(productProductionCost),
  orderItems: many(orderItem),
}))

export const productTagRelations = relations(productTag, ({ one }) => ({
  product: one(product, {
    fields: [productTag.productId],
    references: [product.id],
  }),
  tag: one(inventoryTag, {
    fields: [productTag.tagId],
    references: [inventoryTag.id],
  }),
}))

export const productProductionCostRelations = relations(productProductionCost, ({ one }) => ({
  product: one(product, {
    fields: [productProductionCost.productId],
    references: [product.id],
  }),
  label: one(inventoryProductionCostLabel, {
    fields: [productProductionCost.productionCostLabelId],
    references: [inventoryProductionCostLabel.id],
  }),
}))

export const userRelations_order = relations(user, ({ many }) => ({
  orders: many(order),
}))

export const orderRelations = relations(order, ({ one, many }) => ({
  user: one(user, {
    fields: [order.userId],
    references: [user.id],
  }),
  orderItems: many(orderItem),
}))

export const orderItemRelations = relations(orderItem, ({ one }) => ({
  order: one(order, {
    fields: [orderItem.orderId],
    references: [order.id],
  }),
  product: one(product, {
    fields: [orderItem.productId],
    references: [product.id],
  }),
}))
