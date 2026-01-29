import { d as defineEventHandler, g as getQuery, r as readBody, c as createError } from '../../nitro/nitro.mjs';
import { d as db, i as invoices$1 } from '../../_/schema.mjs';
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

const invoices = defineEventHandler(async (event) => {
  const method = event.node.req.method;
  if (method === "GET") {
    const allInvoices = await db.select().from(invoices$1);
    const status = getQuery(event).status;
    if (status) {
      return allInvoices.filter((inv) => inv.status === status);
    }
    return allInvoices.map((inv) => ({
      ...inv,
      items: JSON.parse(inv.items),
      totalAmount: parseFloat(inv.totalAmount)
    }));
  }
  if (method === "POST") {
    const body = await readBody(event);
    const result = await db.insert(invoices$1).values({
      customerName: body.customerName,
      customerEmail: body.customerEmail,
      customerPhone: body.customerPhone,
      totalAmount: body.totalAmount,
      status: body.status || "pending",
      items: JSON.stringify(body.items)
    }).returning();
    return { success: true, invoice: result[0] };
  }
  if (method === "PUT") {
    const body = await readBody(event);
    const existing = await db.select().from(invoices$1).where(eq(invoices$1.id, body.id)).get();
    if (!existing) {
      throw createError({
        statusCode: 404,
        statusMessage: "Fatura bulunamad\u0131"
      });
    }
    await db.update(invoices$1).set({
      customerName: body.customerName,
      customerEmail: body.customerEmail,
      customerPhone: body.customerPhone,
      totalAmount: body.totalAmount,
      status: body.status,
      items: JSON.stringify(body.items)
    }).where(eq(invoices$1.id, body.id));
    const updated = await db.select().from(invoices$1).where(eq(invoices$1.id, body.id)).get();
    return { success: true, invoice: updated };
  }
  if (method === "DELETE") {
    const id = getQuery(event).id;
    const existing = await db.select().from(invoices$1).where(eq(invoices$1.id, parseInt(id))).get();
    if (!existing) {
      throw createError({
        statusCode: 404,
        statusMessage: "Fatura bulunamad\u0131"
      });
    }
    await db.delete(invoices$1).where(eq(invoices$1.id, parseInt(id)));
    return { success: true, message: "Fatura silindi" };
  }
  throw createError({
    statusCode: 405,
    statusMessage: "Method not allowed"
  });
});

export { invoices as default };
//# sourceMappingURL=invoices.mjs.map
