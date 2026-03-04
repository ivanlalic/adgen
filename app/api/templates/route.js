import { supabase } from '@/lib/supabase'

// GET /api/templates?seccion=HERO  → templates filtrados (con style_guide para uso en cache)
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const seccion = searchParams.get('seccion')

    let query = supabase
      .from('templates')
      .select('id, nombre, seccion, imagen_url, style_guide, created_at')
      .order('created_at', { ascending: false })

    if (seccion) query = query.eq('seccion', seccion.toUpperCase())

    const { data, error } = await query
    if (error) throw new Error(error.message)

    return Response.json({ success: true, templates: data })
  } catch (err) {
    return Response.json({ success: false, error: err.message }, { status: 500 })
  }
}
