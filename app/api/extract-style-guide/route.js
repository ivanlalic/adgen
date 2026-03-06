import Anthropic from '@anthropic-ai/sdk'
import { getServiceClient } from '@/lib/supabase'
import { getUser } from '@/lib/auth-server'
import { parseClaudeJSON } from '@/lib/parseClaudeJSON'
import { PROMPT_EXTRACT_STYLE_GUIDE, generateRawAnalysis } from '@/lib/section-prompts'

export const maxDuration = 120

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

function detectMimeType(buffer) {
  const b = new Uint8Array(buffer)
  if (b[0] === 0xFF && b[1] === 0xD8 && b[2] === 0xFF) return 'image/jpeg'
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4E && b[3] === 0x47) return 'image/png'
  if (b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 &&
      b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50) return 'image/webp'
  if (b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46) return 'image/gif'
  return 'image/jpeg'
}

async function urlToBase64(url) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`No se pudo descargar imagen: ${url}`)
  const buf = await res.arrayBuffer()
  return { data: Buffer.from(buf).toString('base64'), mimeType: detectMimeType(buf) }
}

/**
 * POST /api/extract-style-guide
 * Body: { imagen_url: string, producto_id: string }
 * Extrae la guía de estilo de una imagen generada y la guarda en el producto.
 */
export async function POST(request) {
  try {
    const user = await getUser()
    if (!user) return Response.json({ success: false, error: 'No autorizado' }, { status: 401 })

    const { imagen_url, producto_id } = await request.json()
    if (!imagen_url || !producto_id) {
      return Response.json({ success: false, error: 'imagen_url y producto_id requeridos' }, { status: 400 })
    }

    const db = getServiceClient()

    // Verify ownership
    const { data: producto, error: fetchErr } = await db
      .from('productos')
      .select('id, creado_por')
      .eq('id', producto_id)
      .single()

    if (fetchErr || !producto) return Response.json({ success: false, error: 'Producto no encontrado' }, { status: 404 })
    if (producto.creado_por !== user.id) return Response.json({ success: false, error: 'No autorizado' }, { status: 403 })

    // Download the generated image
    const { data: imageData, mimeType } = await urlToBase64(imagen_url)

    // Claude Opus extracts the style guide
    const claudeRes = await anthropic.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 4096,
      system: PROMPT_EXTRACT_STYLE_GUIDE,
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: mimeType, data: imageData } },
          { type: 'text', text: 'Extrae la guía de estilo completa de esta imagen.' },
        ],
      }],
    })

    const text = claudeRes.content[0]?.text
    if (!text) throw new Error('Claude no devolvió respuesta')

    const parsed = parseClaudeJSON(text)

    // Generate the raw_analysis text for injection into Gemini prompts
    const raw_analysis = generateRawAnalysis(parsed)

    const styleGuide = {
      ...parsed,
      raw_analysis,
      source_image_url: imagen_url,
      extracted_at: new Date().toISOString(),
    }

    // Save to producto
    const { error: updateErr } = await db
      .from('productos')
      .update({ style_guide: styleGuide })
      .eq('id', producto_id)

    if (updateErr) throw new Error(`DB error: ${updateErr.message}`)

    return Response.json({ success: true, style_guide: styleGuide })
  } catch (err) {
    console.error('[/api/extract-style-guide] Error:', err)
    if (err.status === 429) {
      return Response.json({ success: false, error: 'Rate limit de Claude. Esperá unos segundos.', code: 'RATE_LIMIT' }, { status: 429 })
    }
    return Response.json({ success: false, error: err.message }, { status: 500 })
  }
}
