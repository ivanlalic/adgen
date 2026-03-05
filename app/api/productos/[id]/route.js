import { getServiceClient } from '@/lib/supabase'
import { getUser } from '@/lib/auth-server'

export async function DELETE(request, { params }) {
  try {
    const user = await getUser()
    if (!user) return Response.json({ success: false, error: 'No autorizado' }, { status: 401 })

    const { id } = await params
    const db = getServiceClient()
    const { error } = await db
      .from('productos')
      .delete()
      .eq('id', id)
      .eq('creado_por', user.id) // solo puede borrar los suyos
    if (error) throw new Error(error.message)
    return Response.json({ success: true })
  } catch (err) {
    return Response.json({ success: false, error: err.message }, { status: 500 })
  }
}

export async function GET(request, { params }) {
  try {
    const user = await getUser()
    if (!user) return Response.json({ success: false, error: 'No autorizado' }, { status: 401 })

    const { id } = await params
    const db = getServiceClient()
    const { data, error } = await db
      .from('productos')
      .select('*, generaciones(id, imagen_url, angulo, gemini_prompt, version_history, created_at, template_id, templates(seccion, nombre))')
      .eq('id', id)
      .eq('creado_por', user.id)
      .order('created_at', { referencedTable: 'generaciones', ascending: false })
      .single()
    if (error) throw new Error(error.message)
    return Response.json({ success: true, producto: data })
  } catch (err) {
    return Response.json({ success: false, error: err.message }, { status: 500 })
  }
}
