import { getServiceClient } from '@/lib/supabase'
import { getUser } from '@/lib/auth-server'

/**
 * PATCH /api/generaciones/[id]/reorder
 * Body: { section_order: number }
 */
export async function PATCH(request, { params }) {
  try {
    const user = await getUser()
    if (!user) return Response.json({ success: false, error: 'No autorizado' }, { status: 401 })

    const { id } = await params
    const { section_order } = await request.json()

    const db = getServiceClient()

    // Verify ownership via producto
    const { data: gen, error: fetchErr } = await db
      .from('generaciones')
      .select('id, productos(creado_por)')
      .eq('id', id)
      .single()

    if (fetchErr || !gen) return Response.json({ success: false, error: 'No encontrado' }, { status: 404 })
    if (gen.productos.creado_por !== user.id) return Response.json({ success: false, error: 'No autorizado' }, { status: 403 })

    const { error: updateErr } = await db
      .from('generaciones')
      .update({ section_order })
      .eq('id', id)

    if (updateErr) throw new Error(updateErr.message)

    return Response.json({ success: true })
  } catch (err) {
    return Response.json({ success: false, error: err.message }, { status: 500 })
  }
}
