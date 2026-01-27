import { readFile } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'

export default defineEventHandler(async (event) => {
  const filename = getRouterParam(event, 'filename')

  if (!filename) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Filename required'
    })
  }

  const filepath = join(process.cwd(), 'server', 'data', 'avatars', filename)

  if (!existsSync(filepath)) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Avatar not found'
    })
  }

  const file = await readFile(filepath)

  const ext = filename.split('.').pop()
  const contentType = ext === 'png' ? 'image/png' :
                      ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' :
                      ext === 'gif' ? 'image/gif' : 'image/png'

  setHeader(event, 'Content-Type', contentType)
  setHeader(event, 'Cache-Control', 'public, max-age=31536000')

  return file
})
