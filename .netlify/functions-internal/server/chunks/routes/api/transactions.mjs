import { d as defineEventHandler } from '../../nitro/nitro.mjs';
import { d as db, t as transactions$1 } from '../../_/schema.mjs';
import { desc } from 'drizzle-orm';
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

const transactions = defineEventHandler(async (event) => {
  const allTransactions = await db.select().from(transactions$1).orderBy(desc(transactions$1.id));
  return allTransactions;
});

export { transactions as default };
//# sourceMappingURL=transactions.mjs.map
