import { d as defineEventHandler, r as readBody } from '../../../nitro/nitro.mjs';
import { d as db, t as transactions } from '../../../_/schema.mjs';
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

const add_post = defineEventHandler(async (event) => {
  const body = await readBody(event);
  try {
    const timestamp = (/* @__PURE__ */ new Date()).toLocaleString("tr-TR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    }).replace(",", "");
    const result = await db.insert(transactions).values({
      username: body.username || "\u0645\u0633\u062A\u062E\u062F\u0645 \u0627\u0644\u0646\u0638\u0627\u0645",
      timestamp,
      action: body.action,
      description: body.description
    }).returning();
    return { success: true, transaction: result[0] };
  } catch (error) {
    console.error("Error adding transaction:", error);
    return { success: false, error: "Failed to add transaction" };
  }
});

export { add_post as default };
//# sourceMappingURL=add.post.mjs.map
