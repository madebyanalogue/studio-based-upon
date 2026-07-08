type EnquiryMoodboard = {
  id?: string
  name?: string
  items?: unknown[]
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
}

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
  })

  return { ok: true }
})
