// POST /api/generate
// Claude construye el prompt → Gemini genera imagen
// TODO: implementar
export const maxDuration = 60;

export async function POST(request) {
  return Response.json({ success: false, error: 'Not implemented yet' }, { status: 501 });
}
