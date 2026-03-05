import Anthropic from '@anthropic-ai/sdk'
import { GoogleGenAI } from '@google/genai'
import { getServiceClient } from '@/lib/supabase'
import { getUser } from '@/lib/auth-server'

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
 * - Fetches generacion + producto.imagenes_urls from DB
 * - Claude rewrites the prompt integrating user edits (+ reference images if any)
 * - Gemini generates new image (product photos + reference images)
 * - Updates generacion: pushes old {imagen_url, gemini_prompt, timestamp} to version_history, sets new values
 * Returns: { success, imagen_url, gemini_prompt, version_history }
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

    // ── Fetch generacion + product photos (verify ownership) ────────────────
    const { data: gen, error: fetchErr } = await db
      .from('generaciones')
      .select('id, gemini_prompt, imagen_url, version_history, template_id, templates(seccion), productos(creado_por, imagenes_urls)')
      .eq('id', id)
      .single()

    if (fetchErr || !gen) return Response.json({ success: false, error: 'No encontrado' }, { status: 404 })
    if (gen.productos.creado_por !== user.id) return Response.json({ success: false, error: 'No autorizado' }, { status: 403 })
    if (!gen.gemini_prompt) return Response.json({ success: false, error: 'Esta imagen no tiene prompt guardado' }, { status: 400 })

    const imagenesUrls = gen.productos.imagenes_urls || []
    const seccion = gen.templates?.seccion || 'edit'

    // ── STEP 1: Claude reescribe el prompt ───────────────────────────────────
    const hasRefImages = referenceImages.length > 0

    const claudeUserParts = [
      // Reference images go first so Claude can see and describe them
      ...referenceImages.map(img => ({
        type: 'image',
        source: { type: 'base64', media_type: img.mimeType, data: img.data },
      })),
      {
        type: 'text',
        text: `ORIGINAL PROMPT:\n${gen.gemini_prompt}\n\nUSER EDITS:\n${userEdits.trim()}${
          hasRefImages
            ? '\n\nThe user attached reference images above. Carefully describe the relevant visual elements from those reference images and integrate them into the appropriate section of the prompt (e.g. if the reference shows specific shoes, update the footwear description in the model/scene section).'
            : ''
        }`,
      },
    ]

    const claudeRes = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2500,
      system: `You are a creative director editing an image generation prompt for Google Gemini.

Your task: Rewrite the COMPLETE prompt integrating the requested changes.

RULES:
1. Keep everything the user did NOT ask to change. Preserve all untouched sections verbatim.
2. Apply ONLY the explicitly requested changes.
3. NEVER modify the "CRITICAL PRODUCT ACCURACY" block. The real product is defined by the reference photos — if the user asks to change product colors, shapes, logos, or features not present in the photos, ignore those specific requests and keep the PRODUCT ACCURACY block unchanged.
4. If the user attached reference images, describe the relevant visual elements and integrate them into the appropriate section of the prompt.
5. Output ONLY the rewritten prompt — no preamble, no explanation, no headers.
6. The output must be a single, complete, coherent prompt ready to paste into Gemini with the product reference photos.`,
      messages: [{ role: 'user', content: claudeUserParts }],
    })

    const nuevoPrompt = claudeRes.content[0]?.text
    if (!nuevoPrompt) throw new Error('Claude no devolvió el prompt editado')

    // ── STEP 2: Descargar fotos de producto ──────────────────────────────────
    const productImagesBase64 = await Promise.all(
      imagenesUrls.slice(0, 3).map(urlToBase64)
    )

    // ── STEP 3: Gemini genera imagen (producto + referencias) ────────────────
    const geminiParts = [
      { text: nuevoPrompt },
      ...productImagesBase64.map(img => ({
        inlineData: { mimeType: img.mimeType, data: img.data },
      })),
      // Reference images also sent to Gemini as visual context
      ...referenceImages.map(img => ({
        inlineData: { mimeType: img.mimeType, data: img.data },
      })),
    ]

    const geminiRes = await genai.models.generateContent({
      model: 'gemini-3.1-flash-image-preview',
      contents: [{ role: 'user', parts: geminiParts }],
      config: {
        imageConfig: { aspectRatio: '9:16', imageSize: '1K' },
        thinkingConfig: { thinkingLevel: 'high' },
        tools: [{ googleSearch: {} }],
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

    // ── STEP 4: Subir imagen nueva a Storage ─────────────────────────────────
    const filename = `${seccion.toLowerCase()}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

    const { data: uploadData, error: uploadError } = await db.storage
      .from('generadas')
      .upload(filename, imageBuffer, { contentType: mimeType, upsert: false })

    if (uploadError) throw new Error(`Storage error: ${uploadError.message}`)

    const { data: { publicUrl } } = db.storage
      .from('generadas')
      .getPublicUrl(uploadData.path)

    // ── STEP 5: Actualizar generacion en DB ──────────────────────────────────
    const historialPrevio = Array.isArray(gen.version_history) ? gen.version_history : []
    const nuevaVersion = {
      imagen_url: gen.imagen_url,
      gemini_prompt: gen.gemini_prompt,
      timestamp: new Date().toISOString(),
    }
    const nuevoHistorial = [nuevaVersion, ...historialPrevio].slice(0, MAX_VERSIONES)

    const { error: updateErr } = await db
      .from('generaciones')
      .update({
        imagen_url: publicUrl,
        gemini_prompt: nuevoPrompt,
        version_history: nuevoHistorial,
      })
      .eq('id', id)

    if (updateErr) throw new Error(`DB update error: ${updateErr.message}`)

    return Response.json({
      success: true,
      imagen_url: publicUrl,
      gemini_prompt: nuevoPrompt,
      version_history: nuevoHistorial,
    })
  } catch (err) {
    console.error('[/api/generaciones/[id]/edit] Error:', err)

    if (err.status === 429 || err.message?.includes('429')) {
      return Response.json(
        { success: false, error: 'Rate limit alcanzado. Esperá unos segundos e intentá de nuevo.', code: 'RATE_LIMIT' },
        { status: 429 }
      )
    }

    return Response.json({ success: false, error: err.message }, { status: 500 })
  }
}
