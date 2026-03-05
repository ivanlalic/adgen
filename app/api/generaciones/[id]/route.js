import { getServiceClient } from '@/lib/supabase'
import { getUser } from '@/lib/auth-server'

export async function DELETE(request, { params }) {
  try {
    const user = await getUser()
    if (!user) return Response.json({ success: false, error: 'No autorizado' }, { status: 401 })

    const { id } = await params
    const db = getServiceClient()

    // Verificar propiedad a través del producto
    const { data, error: fetchErr } = await db
      .from('generaciones')
      .select('id, productos(creado_por)')
      .eq('id', id)
      .single()

    if (fetchErr || !data) return Response.json({ success: false, error: 'No encontrado' }, { status: 404 })
    if (data.productos.creado_por !== user.id) return Response.json({ success: false, error: 'No autorizado' }, { status: 403 })

    const { error } = await db.from('generaciones').delete().eq('id', id)
    if (error) throw new Error(error.message)

    return Response.json({ success: true })
  } catch (err) {
    return Response.json({ success: false, error: err.message }, { status: 500 })
  }
}
