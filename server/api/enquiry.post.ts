type EnquiryMoodboard = {
  id?: string
  name?: string
  items?: unknown[]
}

type EnquiryFile = {
  name?: string
  type?: string
  size?: number
  data?: string
}

type EnquiryBody = {
  name?: string
  email?: string
  telephone?: string
  message?: string
  source?: string
  items?: unknown[]
  moodboards?: EnquiryMoodboard[]
  hasComposition?: boolean
  files?: EnquiryFile[]
}

const MAX_FILE_BYTES = 10 * 1024 * 1024
const MAX_FILES = 8

export default defineEventHandler(async (event) => {
  const body = await readBody<EnquiryBody>(event)

  const name = body.name?.trim()
  const email = body.email?.trim()

  if (!name || !email) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Name and email are required.',
    })
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Please enter a valid email address.',
    })
  }

  const moodboards = Array.isArray(body.moodboards) ? body.moodboards : []
  const files = Array.isArray(body.files) ? body.files : []

  if (files.length > MAX_FILES) {
    throw createError({
      statusCode: 400,
      statusMessage: `You can attach up to ${MAX_FILES} files.`,
    })
  }

  for (const file of files) {
    if (!file?.name || !file?.data) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid file attachment.',
      })
    }
    if ((file.size || 0) > MAX_FILE_BYTES) {
      throw createError({
        statusCode: 400,
        statusMessage: `"${file.name}" is larger than 10MB.`,
      })
    }
  }

  // Ready to wire to an email provider or CRM — log for now in development
  console.info('[enquiry]', {
    name,
    email,
    telephone: body.telephone?.trim() || '',
    message: body.message?.trim() || '',
    source: body.source || 'unknown',
    itemCount: body.items?.length || 0,
    moodboardCount: moodboards.length,
    moodboards: moodboards.map((board) => ({
      name: board.name || 'Untitled',
      itemCount: Array.isArray(board.items) ? board.items.length : 0,
    })),
    hasComposition: body.hasComposition || false,
    fileCount: files.length,
    files: files.map((file) => ({
      name: file.name,
      type: file.type || 'application/octet-stream',
      size: file.size || 0,
    })),
  })

  return { ok: true }
})
