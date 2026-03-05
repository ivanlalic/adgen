import Anthropic from '@anthropic-ai/sdk'
import { GoogleGenAI } from '@google/genai'
import { getServiceClient } from '@/lib/supabase'
import { getUser } from '@/lib/auth-server'

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
 * POST /api/edit-generate
 * Body: { geminiPrompt, userEdits, imagenesUrls, template, producto_id, referenceImages?: [{data, mimeType}] }
 * Returns: { success, imagen_url, gemini_prompt }
 */
export async function POST(request) {
  try {
    const user = await getUser()
    if (!user) return Response.json({ success: false, error: 'No autorizado' }, { status: 401 })

    const { geminiPrompt, userEdits, imagenesUrls, template, producto_id, referenceImages = [] } = await request.json()

    if (!geminiPrompt || !userEdits?.trim()) {
      return Response.json(
        { success: false, error: 'Faltan prompt original o cambios del usuario' },
        { status: 400 }
      )
    }

    const hasRefImages = referenceImages.length > 0

    // ── STEP 1: Claude reescribe el prompt completo integrando los edits ────
    const claudeUserParts = [
      ...referenceImages.map(img => ({
        type: 'image',
        source: { type: 'base64', media_type: img.mimeType, data: img.data },
      })),
      {
        type: 'text',
        text: `ORIGINAL PROMPT:\n${geminiPrompt}\n\nUSER EDITS:\n${userEdits.trim()}${
          hasRefImages
            ? '\n\nThe user attached reference images above. Carefully describe the relevant visual elements from those reference images and integrate them into the appropriate section of the prompt.'
            : ''
        }`,
      },
    ]

    const claudeRes = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2500,
      system: `You are a creative director editing an image generation prompt for Google Gemini.

You will receive:
1. ORIGINAL PROMPT — the complete Gemini prompt that generated the current image
2. USER EDITS — what the user wants to change (in natural language, may be in Spanish)

Your task: Rewrite the COMPLETE prompt integrating the requested changes.

RULES:
1. Keep everything the user did NOT ask to change. Preserve all untouched sections verbatim.
2. Apply ONLY the explicitly requested changes.
3. NEVER modify the "CRITICAL PRODUCT ACCURACY" block. The real product description is fixed by the reference photos. If the user asks to change product colors, shapes, logos, or features not present in the photos, ignore those specific requests and keep the PRODUCT ACCURACY block unchanged.
4. If the user attached reference images, describe the relevant visual elements and integrate them into the appropriate section of the prompt.
5. Output ONLY the rewritten prompt — no preamble, no explanation, no headers.
6. The output must be a single, complete, coherent prompt ready to paste into Gemini with the product reference photos.`,
      messages: [{ role: 'user', content: claudeUserParts }],
    })

    const nuevoPrompt = claudeRes.content[0]?.text
    if (!nuevoPrompt) throw new Error('Claude no devolvió el prompt editado')

    // ── STEP 2: Descargar fotos de producto ─────────────────────────────────
    const productImagesBase64 = await Promise.all(
      (imagenesUrls || []).slice(0, 3).map(urlToBase64)
    )

    // ── STEP 3: Gemini genera la imagen con el prompt editado ────────────────
    const geminiParts = [
      { text: nuevoPrompt },
      ...productImagesBase64.map(img => ({
        inlineData: { mimeType: img.mimeType, data: img.data },
      })),
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

    // ── STEP 4: Subir imagen a Storage ──────────────────────────────────────
    const serviceClient = getServiceClient()
    const filename = `${(template?.seccion || 'edit').toLowerCase()}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

    const { data: uploadData, error: uploadError } = await serviceClient.storage
      .from('generadas')
      .upload(filename, imageBuffer, { contentType: mimeType, upsert: false })

    if (uploadError) throw new Error(`Storage error: ${uploadError.message}`)

    const { data: { publicUrl } } = serviceClient.storage
      .from('generadas')
      .getPublicUrl(uploadData.path)

    // ── STEP 5: Guardar en DB ────────────────────────────────────────────────
    if (producto_id) {
      await serviceClient.from('generaciones').insert({
        producto_id,
        template_id: template?.id || null,
        imagen_url: publicUrl,
        gemini_prompt: nuevoPrompt,
      })
    }

    return Response.json({ success: true, imagen_url: publicUrl, gemini_prompt: nuevoPrompt })
  } catch (err) {
    console.error('[/api/edit-generate] Error:', err)

    if (err.status === 429 || err.message?.includes('429')) {
      return Response.json(
        { success: false, error: 'Rate limit alcanzado. Esperá unos segundos e intentá de nuevo.', code: 'RATE_LIMIT' },
        { status: 429 }
      )
    }

    return Response.json({ success: false, error: err.message }, { status: 500 })
  }
}
