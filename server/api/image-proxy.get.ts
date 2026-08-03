/**
 * Same-origin image proxy for board thumbnail capture.
 * Sanity CDN often omits CORS headers for credentialed/canvas requests from localhost.
 */
const ALLOWED_HOSTS = new Set([
  'cdn.sanity.io',
  'cdn.sanity.studio',
])

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const raw = typeof query.url === 'string' ? query.url : ''
  if (!raw) {
    throw createError({ statusCode: 400, statusMessage: 'Missing url' })
  }

  let target: URL
  try {
    target = new URL(raw)
  } catch {
    throw createError({ statusCode: 400, statusMessage: 'Invalid url' })
  }

  if (target.protocol !== 'https:' && target.protocol !== 'http:') {
    throw createError({ statusCode: 400, statusMessage: 'Invalid protocol' })
  }
  if (!ALLOWED_HOSTS.has(target.hostname)) {
    throw createError({ statusCode: 403, statusMessage: 'Host not allowed' })
  }

  const upstream = await fetch(target.toString(), {
    headers: {
      Accept: 'image/*,*/*',
      // Avoid browser-cached non-CORS responses on the server path
      'User-Agent': 'basedupon-image-proxy',
    },
  })

  if (!upstream.ok) {
    throw createError({
      statusCode: upstream.status,
      statusMessage: `Upstream ${upstream.status}`,
    })
  }

  const contentType = upstream.headers.get('content-type') || 'image/jpeg'
  const buffer = Buffer.from(await upstream.arrayBuffer())

  setHeader(event, 'Content-Type', contentType)
  setHeader(event, 'Cache-Control', 'public, max-age=86400')
  setHeader(event, 'Access-Control-Allow-Origin', '*')
  return buffer
})
