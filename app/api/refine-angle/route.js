import Anthropic from '@anthropic-ai/sdk'
import { parseClaudeJSON } from '@/lib/parseClaudeJSON'
import { PROMPT_REFINE_ANGLE_SYSTEM, buildRefineAngleUserText } from '@/lib/prompts'

export const maxDuration = 30

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

async function urlToBase64(url) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`No se pudo descargar la imagen: ${url}`)
  const buffer = await res.arrayBuffer()
  return Buffer.from(buffer).toString('base64')
}

export async function POST(request) {
  try {
    const body = await request.json()
    const { angulo_actual, edicion, imagenes_urls, imagenes_referencia } = body

    if (!angulo_actual || !edicion?.trim()) {
      return Response.json({ success: false, error: 'Faltan datos requeridos' }, { status: 400 })
    }

    const imageContents = imagenes_urls?.length
      ? await Promise.all(
          imagenes_urls.map(async (url) => ({
            type: 'image',
            source: { type: 'base64', media_type: 'image/webp', data: await urlToBase64(url) },
          }))
        )
      : []

    const refContents = imagenes_referencia?.length
      ? imagenes_referencia.map(img => ({
          type: 'image',
          source: { type: 'base64', media_type: img.type || 'image/jpeg', data: img.data },
        }))
      : []

    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2000,
      system: PROMPT_REFINE_ANGLE_SYSTEM,
      messages: [{
        role: 'user',
        content: [
          ...imageContents,
          ...refContents,
          { type: 'text', text: buildRefineAngleUserText(angulo_actual, edicion) },
        ],
      }],
    })

    const text = response.content[0]?.text
    if (!text) throw new Error('Claude no devolvió respuesta')

    const data = parseClaudeJSON(text)
    return Response.json({ success: true, data })
  } catch (err) {
    console.error('[/api/refine-angle] Error:', err)

    if (err.status === 429) {
      return Response.json(
        { success: false, error: 'Demasiadas solicitudes. Esperá unos segundos.', code: 'RATE_LIMIT' },
        { status: 429 }
      )
    }

    return Response.json(
      { success: false, error: err.message || 'Error al refinar el ángulo.' },
      { status: 500 }
    )
  }
}
