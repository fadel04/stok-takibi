import { readFile, writeFile } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'

const PROFILES_FILE = join(process.cwd(), 'server', 'data', 'user-profiles.json')

async function loadProfiles() {
  if (!existsSync(PROFILES_FILE)) {
    return {}
  }
  const data = await readFile(PROFILES_FILE, 'utf-8')
  return JSON.parse(data)
}

async function saveProfiles(profiles: any) {
  await writeFile(PROFILES_FILE, JSON.stringify(profiles, null, 2))
}

export default defineEventHandler(async (event) => {
  const method = event.node.req.method

  if (method === 'GET') {
    const query = getQuery(event)
    const email = query.email as string

    if (!email) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Email required'
      })
    }

    const profiles = await loadProfiles()
    return profiles[email] || null
  }

  if (method === 'POST') {
    const body = await readBody(event)
    const { email, avatar, bio, username } = body

    if (!email) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Email required'
      })
    }

    const profiles = await loadProfiles()

    profiles[email] = {
      avatar,
      bio,
      username,
      updatedAt: new Date().toISOString()
    }

    await saveProfiles(profiles)

    return { success: true }
  }

  throw createError({
    statusCode: 405,
    statusMessage: 'Method not allowed'
  })
})
