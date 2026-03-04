import { getServiceClient } from '@/lib/supabase'

export async function DELETE(request, { params }) {
  try {
    const { id } = await params
    const db = getServiceClient()
    const { error } = await db.from('productos').delete().eq('id', id)
    if (error) throw new Error(error.message)
    return Response.json({ success: true })
  } catch (err) {
    return Response.json({ success: false, error: err.message }, { status: 500 })
  }
}

export async function GET(request, { params }) {
  try {
    const { id } = await params
    const db = getServiceClient()
    const { data, error } = await db
      .from('productos')
      .select('*, generaciones(id, imagen_url, angulo, created_at)')
      .eq('id', id)
      .single()
    if (error) throw new Error(error.message)
    return Response.json({ success: true, producto: data })
  } catch (err) {
    return Response.json({ success: false, error: err.message }, { status: 500 })
  }
}
