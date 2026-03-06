import Anthropic from '@anthropic-ai/sdk'
import { getServiceClient } from '@/lib/supabase'
import { PROMPT_ANALYZE_TEMPLATE_SYSTEM } from '@/lib/prompts'

export const maxDuration = 120

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

async function urlToBase64(url) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`No se pudo descargar la imagen del template: ${url}`)
  const buffer = await res.arrayBuffer()
  const contentType = res.headers.get('content-type') || 'image/jpeg'
  return {
    data: Buffer.from(buffer).toString('base64'),
    mimeType: contentType.split(';')[0],
  }
}

// POST { template_id }
// Returns style_guide — uses cached version if already analyzed
export async function POST(request) {
  try {
    const body = await request.json()
    const { template_id } = body

    if (!template_id) {
      return Response.json({ success: false, error: 'template_id requerido' }, { status: 400 })
    }

    const serviceClient = getServiceClient()

    // Fetch template from DB
    const { data: template, error: fetchError } = await serviceClient
      .from('templates')
      .select('id, nombre, imagen_url, style_guide')
      .eq('id', template_id)
      .single()

    if (fetchError || !template) {
      return Response.json({ success: false, error: 'Template no encontrado' }, { status: 404 })
    }

    // Cache hit — return existing style guide
    if (template.style_guide) {
      return Response.json({ success: true, style_guide: template.style_guide, cached: true })
    }

    // Cache miss — run Claude analysis
    const { data: imageBase64, mimeType: mediaType } = await urlToBase64(template.imagen_url)

    const response = await client.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 3000,
      system: PROMPT_ANALYZE_TEMPLATE_SYSTEM,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'image',
            source: { type: 'base64', media_type: mediaType, data: imageBase64 },
          },
          { type: 'text', text: `Analyze this ad template: "${template.nombre}"` },
        ],
      }],
    })

    const styleGuide = response.content[0]?.text
    if (!styleGuide) throw new Error('Claude no devolvió respuesta')

    // Save to DB (cache for next use)
    await serviceClient
      .from('templates')
      .update({ style_guide: styleGuide })
      .eq('id', template_id)

    return Response.json({ success: true, style_guide: styleGuide, cached: false })
  } catch (err) {
    console.error('[/api/analyze-template] Error:', err)

    if (err.status === 429) {
      return Response.json(
        { success: false, error: 'Rate limit de Claude. Esperá unos segundos.', code: 'RATE_LIMIT' },
        { status: 429 }
      )
    }

    return Response.json({ success: false, error: err.message }, { status: 500 })
  }
}
