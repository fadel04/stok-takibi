import { d as defineEventHandler, r as readBody, c as createError, g as getQuery } from '../../nitro/nitro.mjs';
import { d as db, p as products$1 } from '../../_/schema.mjs';
import { eq } from 'drizzle-orm';
import 'node:http';
import 'node:https';
import 'node:events';
import 'node:buffer';
import 'node:fs';
import 'node:path';
import 'node:crypto';
import 'node:url';
import '@iconify/utils';
import 'consola';
import 'drizzle-orm/libsql';
import '@libsql/client';
import 'drizzle-orm/sqlite-core';

const products = defineEventHandler(async (event) => {
  const method = event.node.req.method;
  if (method === "GET") {
    const allProducts = await db.select().from(products$1);
    return allProducts.map((p) => ({
      ...p,
      price: parseFloat(p.price),
      createdAt: p.createdAt || (/* @__PURE__ */ new Date()).toISOString().split("T")[0]
    }));
  }
  if (method === "POST") {
    const body = await readBody(event);
    const result = await db.insert(products$1).values({
      name: body.name,
      description: body.description,
      price: body.price,
      stock: body.stock,
      category: body.category,
      size: body.size,
      createdAt: (/* @__PURE__ */ new Date()).toISOString().split("T")[0]
    }).returning();
    return { success: true, product: result[0] };
  }
  if (method === "PUT") {
    const body = await readBody(event);
    const existing = await db.select().from(products$1).where(eq(products$1.id, body.id)).get();
    if (!existing) {
      throw createError({
        statusCode: 404,
        statusMessage: "\xDCr\xFCn bulunamad\u0131"
      });
    }
    await db.update(products$1).set({
      name: body.name,
      description: body.description,
      price: body.price,
      stock: body.stock,
      category: body.category,
      size: body.size
    }).where(eq(products$1.id, body.id));
    const updated = await db.select().from(products$1).where(eq(products$1.id, body.id)).get();
    return { success: true, product: updated };
  }
  if (method === "DELETE") {
    const id = getQuery(event).id;
    const existing = await db.select().from(products$1).where(eq(products$1.id, parseInt(id))).get();
    if (!existing) {
      throw createError({
        statusCode: 404,
        statusMessage: "\xDCr\xFCn bulunamad\u0131"
      });
    }
    await db.delete(products$1).where(eq(products$1.id, parseInt(id)));
    return { success: true, message: "\xDCr\xFCn silindi" };
  }
  throw createError({
    statusCode: 405,
    statusMessage: "Method not allowed"
  });
});

export { products as default };
//# sourceMappingURL=products.mjs.map
