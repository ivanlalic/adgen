import Anthropic from '@anthropic-ai/sdk'
import { parseClaudeJSON } from '@/lib/parseClaudeJSON'
import { PROMPT_ANGLES_SYSTEM, PROMPT_ANGLES_SINGLE_SYSTEM, buildAnglesUserText } from '@/lib/prompts'

export const maxDuration = 30

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(request) {
  try {
    const body = await request.json()
    const { analisis, sugerencia_angulo } = body

    if (!analisis?.product_analysis) {
      return Response.json(
        { success: false, error: 'Análisis del producto requerido', code: 'INVALID_INPUT' },
        { status: 400 }
      )
    }

    const sugerencia = sugerencia_angulo?.trim() || ''
    const systemPrompt = sugerencia ? PROMPT_ANGLES_SINGLE_SYSTEM : PROMPT_ANGLES_SYSTEM
    const userText = buildAnglesUserText(analisis, sugerencia)

    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: sugerencia ? 2000 : 4000,
      system: systemPrompt,
      messages: [{ role: 'user', content: userText }],
    })

    const text = response.content[0]?.text
    if (!text) throw new Error('Claude no devolvió respuesta')

    const data = parseClaudeJSON(text)
    return Response.json({ success: true, data })
  } catch (err) {
    console.error('[/api/angles] Error:', err)

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
        error: err.message || 'Error al generar los ángulos. Intentá de nuevo.',
        code: 'CLAUDE_ERROR',
      },
      { status: 500 }
    )
  }
}
