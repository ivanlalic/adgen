import Anthropic from '@anthropic-ai/sdk'
import { parseClaudeJSON } from '@/lib/parseClaudeJSON'
import { PROMPT_ANALYZE_VISUAL_SYSTEM, buildAnalyzeUserText } from '@/lib/prompts'

export const maxDuration = 60

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

function validateRequest(body) {
  const errors = []
  if (!body.nombre_producto?.trim()) {
    errors.push('El nombre del producto es requerido')
  }
  if (!Array.isArray(body.imagenes_urls) || body.imagenes_urls.length === 0) {
    errors.push('Al menos 1 imagen es requerida')
  }
  if (body.imagenes_urls?.length > 3) {
    errors.push('Máximo 3 imágenes permitidas')
  }
  return errors
}

async function urlToBase64(url) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`No se pudo descargar la imagen: ${url}`)
  const buffer = await res.arrayBuffer()
  return Buffer.from(buffer).toString('base64')
}

function getMediaType(url) {
  if (url.includes('.jpg') || url.includes('.jpeg')) return 'image/jpeg'
  if (url.includes('.png')) return 'image/png'
  return 'image/webp'
}

export async function POST(request) {
  try {
    const body = await request.json()

    const errors = validateRequest(body)
    if (errors.length > 0) {
      return Response.json(
        { success: false, error: errors.join('. '), code: 'INVALID_INPUT' },
        { status: 400 }
      )
    }

    const imageContents = await Promise.all(
      body.imagenes_urls.map(async (url) => ({
        type: 'image',
        source: {
          type: 'base64',
          media_type: getMediaType(url),
          data: await urlToBase64(url),
        },
      }))
    )

    const userText = buildAnalyzeUserText(body.nombre_producto, body.descripcion || '')

    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 3000,
      system: PROMPT_ANALYZE_VISUAL_SYSTEM,
      messages: [
        {
          role: 'user',
          content: [
            ...imageContents,
            { type: 'text', text: userText },
          ],
        },
      ],
    })

    const text = response.content[0]?.text
    if (!text) throw new Error('Claude no devolvió respuesta')

    const data = parseClaudeJSON(text)

    return Response.json({ success: true, data })
  } catch (err) {
    console.error('[/api/analyze] Error:', err)

    if (err.status === 429) {
      return Response.json(
        {
          success: false,
          error: 'Demasiadas solicitudes a Claude. Esperá unos segundos e intentá de nuevo.',
          code: 'RATE_LIMIT',
        },
        { status: 429 }
      )
    }

    if (err.message?.includes('parsear')) {
      return Response.json(
        {
          success: false,
          error: 'Error al procesar la respuesta de la IA. Intentá de nuevo.',
          code: 'CLAUDE_PARSE_ERROR',
        },
        { status: 500 }
      )
    }

    return Response.json(
      {
        success: false,
        error: err.message || 'Error al analizar el producto. Intentá de nuevo.',
        code: 'CLAUDE_ERROR',
      },
      { status: 500 }
    )
  }
}
