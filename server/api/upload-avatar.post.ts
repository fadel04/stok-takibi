import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    const { avatar, userId } = body

    if (!avatar || !avatar.startsWith('data:image/')) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid image data'
      })
    }

    const base64Data = avatar.split(',')[1]
    const buffer = Buffer.from(base64Data, 'base64')

    const fileExtension = avatar.split(';')[0].split('/')[1]
    const filename = `avatar-${userId}-${Date.now()}.${fileExtension}`

    const uploadDir = join(process.cwd(), 'server', 'data', 'avatars')

    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true })
    }

    const filepath = join(uploadDir, filename)
    await writeFile(filepath, buffer)

    const publicPath = `/api/avatars/${filename}`

    return {
      success: true,
      path: publicPath,
      filename
    }
  } catch (error) {
    throw createError({
      statusCode: 500,
      statusMessage: error instanceof Error ? error.message : 'Failed to upload avatar'
    })
  }
})
