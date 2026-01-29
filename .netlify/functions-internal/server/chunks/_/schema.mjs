import { u as useRuntimeConfig } from '../nitro/nitro.mjs';
import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import { sqliteTable, text, real, integer } from 'drizzle-orm/sqlite-core';

const config = useRuntimeConfig();
const client = createClient({
  url: config.tursoDbUrl || process.env.TURSO_DATABASE_URL || "file:local.db",
  authToken: config.tursoAuthToken || process.env.TURSO_AUTH_TOKEN
});
const db = drizzle(client);

const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  username: text("username"),
  bio: text("bio")
});
const products = sqliteTable("products", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  description: text("description").notNull(),
  price: real("price").notNull(),
  stock: integer("stock").notNull(),
  category: text("category"),
  size: text("size"),
  createdAt: text("created_at").default("CURRENT_TIMESTAMP")
});
const transactions = sqliteTable("transactions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  username: text("username").notNull(),
  action: text("action").notNull(),
  description: text("description").notNull(),
  timestamp: text("timestamp").notNull()
});
const invoices = sqliteTable("invoices", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  customerName: text("customer_name").notNull(),
  customerEmail: text("customer_email"),
  customerPhone: text("customer_phone"),
  totalAmount: real("total_amount").notNull(),
  status: text("status").notNull(),
  createdAt: text("created_at").default("CURRENT_TIMESTAMP"),
  items: text("items").notNull()
});

export { db as d, invoices as i, products as p, transactions as t, users as u };
//# sourceMappingURL=schema.mjs.map
