import Anthropic from '@anthropic-ai/sdk'
import { GoogleGenAI } from '@google/genai'
import { getServiceClient } from '@/lib/supabase'
import { getUser } from '@/lib/auth-server'
import { buildSectionEditSystemPrompt } from '@/lib/section-prompts'

export const maxDuration = 120

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
const genai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })

const MAX_VERSIONES = 10

async function urlToBase64(url) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`No se pudo descargar imagen: ${url}`)
  const buf = await res.arrayBuffer()
  const contentType = res.headers.get('content-type') || 'image/jpeg'
  return { data: Buffer.from(buf).toString('base64'), mimeType: contentType.split(';')[0] }
}

/**
 * POST /api/generaciones/[id]/edit
 * Body: { userEdits, referenceImages?: [{data: string, mimeType: string}] }
 * Uses full campaign context (style_guide + angle) from the producto.
 */
export async function POST(request, { params }) {
  try {
    const user = await getUser()
    if (!user) return Response.json({ success: false, error: 'No autorizado' }, { status: 401 })

    const { id } = await params
    const { userEdits, referenceImages = [] } = await request.json()

    if (!userEdits?.trim()) {
      return Response.json({ success: false, error: 'Falta descripción de cambios' }, { status: 400 })
    }

    const db = getServiceClient()

    // ── Fetch generacion + product data + campaign context ──────────────────
    const { data: gen, error: fetchErr } = await db
      .from('generaciones')
      .select('id, gemini_prompt, imagen_url, version_history, template_id, section_type, templates(seccion), productos(creado_por, imagenes_urls, angle_seleccionado, style_guide)')
      .eq('id', id)
      .single()

    if (fetchErr || !gen) return Response.json({ success: false, error: 'No encontrado' }, { status: 404 })
    if (gen.productos.creado_por !== user.id) return Response.json({ success: false, error: 'No autorizado' }, { status: 403 })
    if (!gen.gemini_prompt) return Response.json({ success: false, error: 'Esta imagen no tiene prompt guardado' }, { status: 400 })

    const imagenesUrls = gen.productos.imagenes_urls || []
    const seccion = gen.section_type || gen.templates?.seccion || 'edit'
    const styleGuide = gen.productos.style_guide || null
    const angulo = gen.productos.angle_seleccionado || null

    // ── Block edits that try to change the real product appearance ───────────
    const PRODUCT_EDIT_BLOCKED = [
      /plantilla.*(negr|roj|azul|verd|blanc)/i,
      /cambiar.*(color|forma|diseño).*(producto|plantilla)/i,
      /agregar.*logo/i,
      /quitar.*burbuja/i,
    ]
    const isBlocked = PRODUCT_EDIT_BLOCKED.some(r => r.test(userEdits))
    if (isBlocked) {
      return Response.json({
        success: false,
        error: 'El aspecto del producto se mantiene fiel a las fotos reales. ¿Querés cambiar otro elemento de la imagen?',
        code: 'PRODUCT_EDIT_BLOCKED',
      }, { status: 422 })
    }

    // ── STEP 1+2 en paralelo: Claude reescribe prompt + descarga fotos ───────
    const hasRefImages = referenceImages.length > 0

    const claudeUserParts = [
      ...referenceImages.map(img => ({
        type: 'image',
        source: { type: 'base64', media_type: img.mimeType, data: img.data },
      })),
      {
        type: 'text',
        text: `ORIGINAL PROMPT:\n${gen.gemini_prompt}\n\nUSER EDITS:\n${userEdits.trim()}${
          hasRefImages
            ? '\n\nThe user attached reference images above. Carefully describe the relevant visual elements and integrate them into the appropriate section of the prompt.'
            : ''
        }`,
      },
    ]

    const systemPrompt = buildSectionEditSystemPrompt({ styleGuide, angulo })

    const [claudeRes, productImagesBase64] = await Promise.all([
      anthropic.messages.create({
        model: 'claude-opus-4-6',
        max_tokens: 2500,
        system: systemPrompt,
        messages: [{ role: 'user', content: claudeUserParts }],
      }),
      Promise.all(imagenesUrls.slice(0, 3).map(urlToBase64)),
    ])

    const nuevoPrompt = claudeRes.content[0]?.text
    if (!nuevoPrompt) throw new Error('Claude no devolvió el prompt editado')

    // ── STEP 3: Gemini genera imagen ─────────────────────────────────────────
    const geminiParts = [
      { text: nuevoPrompt },
      ...productImagesBase64.map(img => ({ inlineData: { mimeType: img.mimeType, data: img.data } })),
      ...referenceImages.map(img => ({ inlineData: { mimeType: img.mimeType, data: img.data } })),
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

    const imageBuffer = Buffer.from(imagePart.inlineData.data, 'base64')
    const mimeType = imagePart.inlineData.mimeType
    const ext = mimeType.split('/')[1] || 'png'

    // ── STEP 4: Upload ────────────────────────────────────────────────────────
    const filename = `${seccion.toLowerCase()}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
    const { data: uploadData, error: uploadError } = await db.storage
      .from('generadas')
      .upload(filename, imageBuffer, { contentType: mimeType, upsert: false })

    if (uploadError) throw new Error(`Storage error: ${uploadError.message}`)

    const { data: { publicUrl } } = db.storage.from('generadas').getPublicUrl(uploadData.path)

    // ── STEP 5: Update generacion in DB ──────────────────────────────────────
    const historialPrevio = Array.isArray(gen.version_history) ? gen.version_history : []
    const nuevaVersion = { imagen_url: gen.imagen_url, gemini_prompt: gen.gemini_prompt, timestamp: new Date().toISOString() }
    const nuevoHistorial = [nuevaVersion, ...historialPrevio].slice(0, MAX_VERSIONES)

    const { error: updateErr } = await db
      .from('generaciones')
      .update({ imagen_url: publicUrl, gemini_prompt: nuevoPrompt, version_history: nuevoHistorial })
      .eq('id', id)

    if (updateErr) throw new Error(`DB update error: ${updateErr.message}`)

    return Response.json({ success: true, imagen_url: publicUrl, gemini_prompt: nuevoPrompt, version_history: nuevoHistorial })
  } catch (err) {
    console.error('[/api/generaciones/[id]/edit] Error:', err)
    if (err.status === 429 || err.message?.includes('429')) {
      return Response.json({ success: false, error: 'Rate limit alcanzado. Esperá unos segundos.', code: 'RATE_LIMIT' }, { status: 429 })
    }
    return Response.json({ success: false, error: err.message }, { status: 500 })
  }
}
