import { getServiceClient } from '@/lib/supabase'
import { getUser } from '@/lib/auth-server'

export async function GET() {
  try {
    const user = await getUser()
    if (!user) return Response.json({ success: false, error: 'No autorizado' }, { status: 401 })

    const db = getServiceClient()
    const { data, error } = await db
      .from('productos')
      .select('id, nombre, descripcion, imagen_url, imagenes_urls, analisis, created_at, generaciones(count)')
      .eq('creado_por', user.id)
      .order('created_at', { ascending: false })

    if (error) throw new Error(error.message)
    return Response.json({ success: true, productos: data })
  } catch (err) {
    return Response.json({ success: false, error: err.message }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    const user = await getUser()
    if (!user) return Response.json({ success: false, error: 'No autorizado' }, { status: 401 })

    const { nombre, descripcion, imagen_url, imagenes_urls, analisis } = await request.json()
    if (!nombre) return Response.json({ success: false, error: 'nombre requerido' }, { status: 400 })

    const db = getServiceClient()
    const { data, error } = await db
      .from('productos')
      .insert({ nombre, descripcion, imagen_url, imagenes_urls, analisis, creado_por: user.id })
      .select()
      .single()

    if (error) throw new Error(error.message)
    return Response.json({ success: true, producto: data })
  } catch (err) {
    return Response.json({ success: false, error: err.message }, { status: 500 })
  }
}
