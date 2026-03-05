import Anthropic from '@anthropic-ai/sdk'
import { GoogleGenAI } from '@google/genai'
import { getServiceClient } from '@/lib/supabase'
import { getUser } from '@/lib/auth-server'
import { buildSectionSystemPrompt } from '@/lib/section-prompts'

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
 * POST /api/generate-section
 * Body: {
 *   producto_id: string,
 *   section_type: string,          // hero | problem | before_after | product_detail | testimonials | comparison | cta_final
 *   template_image_base64: string, // base64 of structure template uploaded by user
 *   template_image_mime: string,
 *   section_order: number,
 * }
 */
export async function POST(request) {
  try {
    const user = await getUser()
    if (!user) return Response.json({ success: false, error: 'No autorizado' }, { status: 401 })

    const {
      producto_id,
      section_type = 'hero',
      template_image_base64,
      template_image_mime = 'image/jpeg',
      section_order = 0,
    } = await request.json()

    if (!producto_id) return Response.json({ success: false, error: 'producto_id requerido' }, { status: 400 })

    const db = getServiceClient()

    // ── Load producto (verify ownership) ─────────────────────────────────────
    const { data: producto, error: fetchErr } = await db
      .from('productos')
      .select('id, nombre, descripcion, imagenes_urls, analisis, angle_seleccionado, style_guide, product_visual_description, creado_por')
      .eq('id', producto_id)
      .single()

    if (fetchErr || !producto) return Response.json({ success: false, error: 'Producto no encontrado' }, { status: 404 })
    if (producto.creado_por !== user.id) return Response.json({ success: false, error: 'No autorizado' }, { status: 403 })

    const angulo = producto.angle_seleccionado
    if (!angulo) return Response.json({ success: false, error: 'Este producto no tiene un ángulo guardado. Generá primero un hero.' }, { status: 400 })

    // ── STEP 1: Analyze template structure with Claude (if template provided) ─
    let templateAnalysis = null
    const claudeUserParts = []

    if (template_image_base64) {
      claudeUserParts.push({
        type: 'image',
        source: { type: 'base64', media_type: template_image_mime, data: template_image_base64 },
      })
    }
    // Also attach style guide source image if available
    if (producto.style_guide?.source_image_url) {
      try {
        const sgImg = await urlToBase64(producto.style_guide.source_image_url)
        claudeUserParts.push({
          type: 'image',
          source: { type: 'base64', media_type: sgImg.mimeType, data: sgImg.data },
        })
      } catch {}
    }
    claudeUserParts.push({
      type: 'text',
      text: template_image_base64
        ? 'First image is the STRUCTURE TEMPLATE (extract layout only). Second image (if present) is the STYLE GUIDE reference. Generate the Gemini prompt now.'
        : 'Generate the Gemini prompt now using the provided inputs.',
    })

    const systemPrompt = buildSectionSystemPrompt({
      producto,
      angulo,
      styleGuide: producto.style_guide,
      sectionType: section_type,
      templateAnalysis,
    })

    const claudeRes = await anthropic.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 2500,
      system: systemPrompt,
      messages: [{ role: 'user', content: claudeUserParts.length ? claudeUserParts : [{ type: 'text', text: 'Generate the Gemini prompt now.' }] }],
    })

    const geminiPrompt = claudeRes.content[0]?.text
    if (!geminiPrompt) throw new Error('Claude no devolvió el prompt')

    // ── STEP 2: Download product photos ───────────────────────────────────────
    const productImagesBase64 = await Promise.all(
      (producto.imagenes_urls || []).slice(0, 3).map(urlToBase64)
    )

    // ── STEP 3: Gemini generates image ────────────────────────────────────────
    const geminiParts = [
      { text: geminiPrompt },
      ...productImagesBase64.map(img => ({ inlineData: { mimeType: img.mimeType, data: img.data } })),
    ]

    const geminiRes = await genai.models.generateContent({
      model: 'gemini-3.1-flash-image-preview',
      contents: [{ role: 'user', parts: geminiParts }],
      config: {
        imageConfig: { aspectRatio: '9:16' },
        thinkingConfig: { thinkingLevel: 'high' },
      },
    })

    const candidates = geminiRes.candidates || []
    if (!candidates.length) throw new Error('Gemini no devolvió candidatos')

    const imagePart = candidates[0].content.parts.find(p => p.inlineData?.mimeType?.startsWith('image/'))
    if (!imagePart) {
      const textPart = candidates[0].content.parts.find(p => p.text)
      throw new Error(textPart?.text ? `Gemini no generó imagen: ${textPart.text.slice(0, 200)}` : 'Gemini no generó imagen')
    }

    // ── STEP 4: Upload to Storage ─────────────────────────────────────────────
    const imageBuffer = Buffer.from(imagePart.inlineData.data, 'base64')
    const mimeType = imagePart.inlineData.mimeType
    const ext = mimeType.split('/')[1] || 'png'
    const filename = `${section_type}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

    const { data: uploadData, error: uploadError } = await db.storage
      .from('generadas')
      .upload(filename, imageBuffer, { contentType: mimeType, upsert: false })

    if (uploadError) throw new Error(`Storage error: ${uploadError.message}`)

    const { data: { publicUrl } } = db.storage.from('generadas').getPublicUrl(uploadData.path)

    // ── STEP 5: Save to DB ────────────────────────────────────────────────────
    const { data: generacion, error: insertErr } = await db
      .from('generaciones')
      .insert({
        producto_id,
        angulo,
        template_id: null,
        imagen_url: publicUrl,
        gemini_prompt: geminiPrompt,
        section_type,
        section_order,
        version_history: [],
      })
      .select()
      .single()

    if (insertErr) throw new Error(`DB error: ${insertErr.message}`)

    return Response.json({ success: true, imagen_url: publicUrl, gemini_prompt: geminiPrompt, generacion_id: generacion.id })
  } catch (err) {
    console.error('[/api/generate-section] Error:', err)
    if (err.status === 429 || err.message?.includes('429')) {
      return Response.json({ success: false, error: 'Rate limit alcanzado. Esperá unos segundos.', code: 'RATE_LIMIT' }, { status: 429 })
    }
    return Response.json({ success: false, error: err.message }, { status: 500 })
  }
}
