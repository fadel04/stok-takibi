import { d as defineEventHandler, r as readBody, c as createError } from '../../nitro/nitro.mjs';
import { d as db, u as users$1 } from '../../_/schema.mjs';
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

const users = defineEventHandler(async (event) => {
  const method = event.node.req.method;
  if (method === "GET") {
    const allUsers = await db.select({
      id: users$1.id,
      email: users$1.email,
      name: users$1.name,
      username: users$1.username,
      bio: users$1.bio
    }).from(users$1);
    return allUsers;
  }
  if (method === "POST") {
    const body = await readBody(event);
    const user = await db.select().from(users$1).where(eq(users$1.email, body.email)).get();
    if (user && user.password === body.password) {
      const { password, ...userWithoutPassword } = user;
      return { success: true, user: userWithoutPassword };
    }
    throw createError({
      statusCode: 401,
      statusMessage: "E-posta veya \u015Fifre yanl\u0131\u015F"
    });
  }
  if (method === "PUT") {
    const body = await readBody(event);
    const existingUser = await db.select().from(users$1).where(eq(users$1.id, body.id)).get();
    if (!existingUser) {
      throw createError({
        statusCode: 404,
        statusMessage: "User not found"
      });
    }
    if (body.email !== existingUser.email) {
      const emailExists = await db.select().from(users$1).where(eq(users$1.email, body.email)).get();
      if (emailExists) {
        throw createError({
          statusCode: 400,
          statusMessage: "E-posta zaten kullan\u0131l\u0131yor"
        });
      }
    }
    await db.update(users$1).set({
      name: body.name || existingUser.name,
      email: body.email || existingUser.email,
      username: body.username || existingUser.username,
      bio: body.bio,
      password: body.password || existingUser.password
    }).where(eq(users$1.id, body.id));
    const updatedUser = await db.select().from(users$1).where(eq(users$1.id, body.id)).get();
    const { password, ...userWithoutPassword } = updatedUser;
    return { success: true, user: userWithoutPassword };
  }
  throw createError({
    statusCode: 405,
    statusMessage: "Method not allowed"
  });
});

export { users as default };
//# sourceMappingURL=users.mjs.map
