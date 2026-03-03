/**
 * Parser robusto para respuestas JSON de Claude.
 * Claude a veces envuelve JSON en bloques markdown ```json ... ```.
 * Esta función maneja los tres casos posibles.
 */
export function parseClaudeJSON(text) {
  // Intento 1: parse directo
  try {
    return JSON.parse(text);
  } catch (e) {
    // Intento 2: limpiar bloques markdown
    const cleaned = text
      .replace(/```json\s*/g, '')
      .replace(/```\s*/g, '')
      .trim();
    try {
      return JSON.parse(cleaned);
    } catch (e2) {
      // Intento 3: extraer el primer { ... } completo
      const match = cleaned.match(/\{[\s\S]*\}/);
      if (match) {
        return JSON.parse(match[0]);
      }
      throw new Error('No se pudo parsear la respuesta de Claude');
    }
  }
}
