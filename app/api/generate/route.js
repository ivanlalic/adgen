import Anthropic from '@anthropic-ai/sdk'
import { GoogleGenAI } from '@google/genai'
import { getServiceClient } from '@/lib/supabase'
import { getUser } from '@/lib/auth-server'
import { buildGenerateSystemPrompt } from '@/lib/prompts'

export const maxDuration = 120

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
const genai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })

async function urlToBase64(url) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`No se pudo descargar imagen: ${url}`)
  const buf = await res.arrayBuffer()
  const contentType = res.headers.get('content-type') || 'image/jpeg'
  return { data: Buffer.from(buf).toString('base64'), mimeType: contentType.split(';')[0] }
}

/**
 * POST /api/generate
 * Body: { nombreProducto, descripcion, imagenesUrls, angulo, template }
 * Returns: { success, imagen_url, gemini_prompt }
 */
export async function POST(request) {
  try {
    const user = await getUser()
    if (!user) return Response.json({ success: false, error: 'No autorizado' }, { status: 401 })

    const { nombreProducto, descripcion, imagenesUrls, angulo, template, producto_id } = await request.json()

    if (!angulo || !template?.style_guide) {
      return Response.json(
        { success: false, error: 'Faltan ángulo o style guide del template' },
        { status: 400 }
      )
    }

    // ── STEP 1: Claude construye el prompt para Gemini ──────────────────────
    const systemPrompt = buildGenerateSystemPrompt({
      styleGuide: template.style_guide,
      angulo,
      producto: { nombre: nombreProducto, descripcion },
      seccion: template.seccion,
    })

    // Download product images for Claude (max 3)
    const productImagesBase64 = await Promise.all(
      (imagenesUrls || []).slice(0, 3).map(urlToBase64)
    )

    const claudeUserParts = [
      ...productImagesBase64.map(img => ({
        type: 'image',
        source: { type: 'base64', media_type: img.mimeType, data: img.data },
      })),
      { type: 'text', text: 'Build the Gemini image generation prompt now based on the product images above.' },
    ]

    const claudeRes = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2500,
      system: systemPrompt,
      messages: [{ role: 'user', content: claudeUserParts }],
    })

    const geminiPrompt = claudeRes.content[0]?.text
    if (!geminiPrompt) throw new Error('Claude no devolvió el prompt')

    // ── STEP 2: Gemini genera la imagen ────────────────────────────────────
    const geminiParts = [
      { text: geminiPrompt },
      ...productImagesBase64.map(img => ({
        inlineData: { mimeType: img.mimeType, data: img.data },
      })),
    ]

    const geminiRes = await genai.models.generateContent({
      model: 'gemini-3.1-flash-image-preview',
      contents: [{ role: 'user', parts: geminiParts }],
      config: {
        imageConfig: { aspectRatio: '9:16', imageSize: '1K' },
      },
    })

    const candidates = geminiRes.candidates || []
    if (!candidates.length) throw new Error('Gemini no devolvió candidatos')

    const imagePart = candidates[0].content.parts.find(
      p => p.inlineData?.mimeType?.startsWith('image/')
    )
    if (!imagePart) {
      const textPart = candidates[0].content.parts.find(p => p.text)
      throw new Error(
        textPart?.text
          ? `Gemini no generó imagen: ${textPart.text.slice(0, 200)}`
          : 'Gemini no generó imagen (sin detalle)'
      )
    }

    const imageBuffer = Buffer.from(imagePart.inlineData.data, 'base64')
    const mimeType = imagePart.inlineData.mimeType
    const ext = mimeType.split('/')[1] || 'png'

    // ── STEP 3: Subir imagen generada a Storage ────────────────────────────
    const serviceClient = getServiceClient()
    const filename = `${template.seccion.toLowerCase()}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

    const { data: uploadData, error: uploadError } = await serviceClient.storage
      .from('generadas')
      .upload(filename, imageBuffer, { contentType: mimeType, upsert: false })

    if (uploadError) throw new Error(`Storage error: ${uploadError.message}`)

    const { data: { publicUrl } } = serviceClient.storage
      .from('generadas')
      .getPublicUrl(uploadData.path)

    // ── STEP 4: Guardar generacion en DB ───────────────────────────────────
    if (producto_id) {
      await serviceClient.from('generaciones').insert({
        producto_id,
        angulo,
        template_id: template.id || null,
        imagen_url: publicUrl,
        gemini_prompt: geminiPrompt,
      })
    }

    return Response.json({ success: true, imagen_url: publicUrl, gemini_prompt: geminiPrompt })
  } catch (err) {
    console.error('[/api/generate] Error:', err)

    if (err.status === 429 || err.message?.includes('429')) {
      return Response.json(
        { success: false, error: 'Rate limit alcanzado. Esperá unos segundos e intentá de nuevo.', code: 'RATE_LIMIT' },
        { status: 429 }
      )
    }

    return Response.json({ success: false, error: err.message }, { status: 500 })
  }
}
