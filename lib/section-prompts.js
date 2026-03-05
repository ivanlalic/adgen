/**
 * Campaign / Section system prompts and helpers.
 * Separated from prompts.js to keep file size manageable.
 */

export const SECTION_CONFIG = {
  hero: {
    label: 'Hero / Cabecera',
    description: 'Primera impresión. Detiene el scroll.',
    angle_mapping: {
      headline_source: 'hook',
      subheadline_source: 'subhook',
      benefits_source: 'benefits',
      tone: 'Provocativo, directo, genera tensión o curiosidad',
    },
    prompt_instruction: `Esta es la sección HERO — primera imagen que ve el usuario. El headline debe ser el HOOK del ángulo, impactante y corto. Debe detener el scroll en 2 segundos. Producto protagonista, beneficios visibles, social proof arriba. HERO COMPRESSION OBLIGATORIA: 1 vista de producto, subheadline ≤15 palabras, exactamente 3 beneficios angle-específicos, modelo con cara O pies (no ambos), 1 efecto principal máximo.`,
  },
  problem: {
    label: 'Problema / Dolor',
    description: 'Agita el problema del avatar. El usuario dice "eso me pasa a mí".',
    angle_mapping: {
      headline_source: 'body_paragraphs_1_2',
      subheadline_source: 'avatar_frustration',
      benefits_source: null,
      tone: 'Empático pero provocador. Mostrar la consecuencia de no actuar.',
    },
    prompt_instruction: `Esta es la sección PROBLEMA/DOLOR. NO mostrar el producto aún. Mostrar la FRUSTRACIÓN y el DOLOR del avatar en su vida diaria. El objetivo es que el usuario diga "sí, eso me pasa a mí".`,
  },
  before_after: {
    label: 'Antes / Después',
    description: 'Contraste entre la realidad sin producto y con producto.',
    angle_mapping: {
      before_text: 'body_paragraph_1',
      after_text: 'body_paragraph_4',
      tone: 'Contraste dramático. El ANTES debe doler, el DESPUÉS debe aliviar.',
    },
    prompt_instruction: `Esta es la sección ANTES/DESPUÉS. Layout dividido: lado izquierdo ANTES (colores apagados), lado derecho DESPUÉS (colores vivos). Textos cortos y paralelos. Flecha o transición visual entre estados. El producto puede aparecer sutilmente en el lado DESPUÉS.`,
  },
  product_detail: {
    label: 'Producto en detalle',
    description: 'Zoom al producto. Características técnicas visibles.',
    angle_mapping: {
      headline_source: 'body_paragraph_3',
      subheadline_source: 'subhook',
      benefits_source: 'benefits',
      tone: 'Técnico pero accesible. Zoom al producto.',
    },
    prompt_instruction: `Esta es la sección PRODUCTO EN DETALLE. El producto es el 100% del protagonismo. Mostrar múltiples vistas o zoom a características clave. Textos explicativos de cada característica. Estilo: catálogo premium, fotografía de producto profesional.`,
  },
  testimonials: {
    label: 'Testimonios',
    description: 'Social proof con quotes de clientes.',
    angle_mapping: {
      testimonials_source: 'avatar',
      tone: 'Cercano, creíble, real. Los testimonios deben sonar como gente real.',
    },
    prompt_instruction: `Esta es la sección de TESTIMONIOS. Mostrar 2-3 testimonios de clientes basados en el perfil del avatar (misma edad, misma frustración, mismo lenguaje). Incluir nombre, edad y foto de perfil genérica. Formato: quote + estrellas + nombre. Los testimonios deben mencionar el PROBLEMA y el RESULTADO. Nunca claims médicos.`,
  },
  comparison: {
    label: 'Comparativa',
    description: 'Nuestro producto vs alternativa genérica o cara.',
    angle_mapping: {
      comparison_source: 'body_paragraph_3',
      tone: 'Objetivo pero favorable. Tabla o visual comparativo.',
    },
    prompt_instruction: `Esta es la sección COMPARATIVA. Nuestro producto vs alternativa barata y/o cara. Formato tabla o lado a lado. Nuestro producto en el medio como "alternativa inteligente". Checks verdes para nuestro producto, X rojas para los otros.`,
  },
  cta_final: {
    label: 'CTA Final',
    description: 'Cierre con urgencia + oferta + garantía.',
    angle_mapping: {
      headline_source: 'body_paragraph_5',
      tone: 'Urgencia + seguridad. Eliminar riesgo de compra.',
    },
    prompt_instruction: `Esta es la sección de CTA FINAL. Headline de urgencia. Repetir garantía 30 días + envío gratis + contrareembolso de forma prominente. Producto visible pero secundario. Foco en el CTA y eliminar el riesgo de compra.`,
  },
}

/**
 * Genera el raw_analysis de texto plano a partir del style_guide estructurado.
 * Se inyecta en prompts de Gemini para mantener coherencia visual de campaña.
 */
export function generateRawAnalysis(styleGuide) {
  return `STYLE_GUIDE DE LA CAMPAÑA (OBLIGATORIO — respetar en todas las generaciones):

PALETA:
- Fondo: ${styleGuide.palette.background}
- Acento primario: ${styleGuide.palette.accent_primary}
- Acento secundario: ${styleGuide.palette.accent_secondary}
- Texto principal: ${styleGuide.palette.text_primary}
- Texto secundario: ${styleGuide.palette.text_secondary}
- Cards/UI: ${styleGuide.palette.cards_ui}
- PROHIBIDO: ${styleGuide.palette.prohibited_colors}

TIPOGRAFÍA:
- Headlines: ${styleGuide.typography.headlines}
- Subheadlines: ${styleGuide.typography.subheadlines}
- Beneficios: ${styleGuide.typography.benefits}
- Footer: ${styleGuide.typography.footer}

MOOD:
- Estética: ${styleGuide.mood.aesthetic}
- Iluminación: ${styleGuide.mood.lighting}
- Atmósfera: ${styleGuide.mood.atmosphere}
- Fondo: ${styleGuide.mood.background_style}

EFECTOS:
- Glow: ${styleGuide.effects.glow}
- Rim light: ${styleGuide.effects.rim_light}
- Partículas: ${styleGuide.effects.particles}

ELEMENTOS DE CONVERSIÓN:
- Social proof: ${styleGuide.conversion_elements.social_proof}
- Sello garantía: GARANTÍA 30 DÍAS / ENVÍO GRATIS (siempre fijo — no modificar)
- Cards beneficios: ${styleGuide.conversion_elements.benefit_cards}
- Footer: ${styleGuide.conversion_elements.footer}`
}

/**
 * Mega-prompt para Claude Opus al generar una nueva sección de campaña.
 */
export function buildSectionSystemPrompt({ producto, angulo, styleGuide, sectionType, templateAnalysis }) {
  const config = SECTION_CONFIG[sectionType] || SECTION_CONFIG.hero
  const hasStyleGuide = styleGuide && styleGuide.raw_analysis

  return `Eres un director creativo experto en e-commerce y generación de imágenes publicitarias para el mercado español (España, tutear siempre).

Tu tarea: generar un prompt optimizado para Gemini (generación de imágenes) para una sección específica de una landing page.

---

PRODUCTO:
Nombre: ${producto.nombre}
Descripción: ${producto.descripcion || 'N/A'}
Descripción visual REAL del producto: ${producto.product_visual_description || 'Ver fotos de referencia adjuntas'}
IMPORTANTE: El usuario adjuntará fotos reales del producto a Gemini. El prompt NUNCA debe inventar características visuales no presentes en la descripción visual ni en las fotos.

---

ÁNGULO DE VENTA COMPLETO DE ESTA CAMPAÑA:
Título: ${angulo.angle_name || ''}
Categoría: ${angulo.psychological_trigger || ''}
Hook: ${angulo.copy?.hook || angulo.hook || ''}
Subhook: ${angulo.subhook || ''}
Headline imagen: ${angulo.copy?.headline || ''}
Subheadline imagen: ${angulo.copy?.subheadline || ''}
Body copy: ${angulo.copy?.body_copy || ''}
Avatar: ${typeof angulo.target_avatar === 'object' ? JSON.stringify(angulo.target_avatar) : (angulo.target_avatar || '')}
Beneficios: ${(angulo.copy?.bullets || []).join(' | ')}
CTA: ${angulo.copy?.cta || ''}
Urgencia: ${angulo.copy?.urgency_line || ''}
Visual scene: ${angulo.visual_direction?.scene || ''}
Mood: ${angulo.visual_direction?.mood || ''}
Colores: ${angulo.visual_direction?.color_palette || ''}

---

${hasStyleGuide
  ? `GUÍA DE ESTILO DE LA CAMPAÑA (OBLIGATORIO):\n${styleGuide.raw_analysis}`
  : `No hay guía de estilo definida aún. Usar estética deportiva premium (azul oscuro, cyan, blanco) como default.`}

---

TEMPLATE DE ESTRUCTURA:
${templateAnalysis || 'Ver imagen del template adjunta — extraer SOLO la estructura/layout (zonas, disposición). NO copiar colores ni tipografía del template.'}

---

SECCIÓN A GENERAR: ${config.label}
${config.prompt_instruction}

MAPEO DE CONTENIDO DEL ÁNGULO:
${JSON.stringify(config.angle_mapping, null, 2)}

---

REGLAS PARA EL PROMPT DE GEMINI:
1. Prompt en INGLÉS. Textos dentro de la imagen en ESPAÑOL DE ESPAÑA (tú, nunca vos).
2. Incluir bloque "CRITICAL PRODUCT ACCURACY" con descripción visual real del producto.
3. Hex codes específicos para TODOS los colores (de la guía de estilo si disponible).
4. Describir composición zona por zona, de arriba a abajo.
5. NO exceder 500 palabras.
6. SELLO: siempre "GARANTÍA 30 DÍAS" (arco superior) + "ENVÍO GRATIS" (arco inferior) — NUNCA "100% Original".
7. Cerrar con: "Aspect ratio: 9:16. Resolution: 2K."
8. TODO el contenido textual DEBE derivar del ángulo de venta. NO inventar.

Responde SOLO con el prompt de Gemini, sin explicaciones.`
}

/**
 * Prompt para edición de sección con contexto completo de campaña.
 */
export function buildSectionEditSystemPrompt({ styleGuide, angulo }) {
  const hasStyleGuide = styleGuide && styleGuide.raw_analysis
  return `Eres un experto en prompts para generación de imágenes con Gemini.

${hasStyleGuide ? `GUÍA DE ESTILO DE LA CAMPAÑA (no modificar sin instrucción explícita):\n${styleGuide.raw_analysis}\n\n` : ''}ÁNGULO DE VENTA (referencia):
- Hook: ${angulo?.copy?.hook || angulo?.hook || ''}
- Headline: ${angulo?.copy?.headline || ''}
- Beneficios: ${(angulo?.copy?.bullets || []).join(' | ')}

REGLAS:
- Reescribir el prompt COMPLETO integrando SOLO los cambios pedidos.
- NO tocar lo que el usuario NO pidió cambiar.
- NUNCA modificar el bloque CRITICAL PRODUCT ACCURACY.
- NUNCA modificar colores/tipografía de la guía de estilo salvo instrucción explícita.
- Si el usuario pide cambiar el aspecto del producto real, IGNORAR y mantener descripción original.
- Idioma: prompt en inglés, textos de imagen en español de España.
- SELLO: siempre "GARANTÍA 30 DÍAS" / "ENVÍO GRATIS".
- Cerrar con: "Aspect ratio: 9:16. Resolution: 2K."

Responde SOLO con el prompt nuevo, sin explicaciones.`
}

export const PROMPT_EXTRACT_STYLE_GUIDE = `Eres un director de arte experto en branding visual para e-commerce.

Analiza esta imagen y extrae una guía de estilo completa que pueda aplicarse a futuras imágenes de la misma campaña. El objetivo es que cualquier imagen nueva generada para esta campaña mantenga coherencia visual con esta imagen de referencia.

Responde SOLO con un JSON válido, sin markdown ni explicaciones. Estructura exacta:

{
  "palette": {
    "background": "descripción del fondo con hex codes",
    "accent_primary": "color de acento principal con hex",
    "accent_secondary": "color de acento secundario con hex",
    "text_primary": "color de texto principal con hex",
    "text_secondary": "color de texto secundario con hex y opacidad",
    "cards_ui": "estilo de cards/elementos UI con hex",
    "prohibited_colors": "colores que NO deben usarse en esta estética"
  },
  "typography": {
    "headlines": "descripción del estilo de titulares",
    "subheadlines": "descripción del estilo de subtítulos",
    "benefits": "descripción del estilo de textos de beneficios",
    "footer": "descripción del estilo de footer/CTA"
  },
  "mood": {
    "aesthetic": "descripción de la estética general y referencias de marca",
    "lighting": "tipo de iluminación y temperatura de color",
    "atmosphere": "atmósfera general, viñetas, profundidad",
    "background_style": "reglas del fondo"
  },
  "effects": {
    "glow": "descripción de efectos de resplandor si hay",
    "rim_light": "descripción de rim light si hay",
    "particles": "descripción de partículas/efectos adicionales"
  },
  "conversion_elements": {
    "social_proof": "estilo del badge de social proof",
    "guarantee_seal": "GARANTÍA 30 DÍAS / ENVÍO GRATIS — describir forma y colores",
    "benefit_cards": "estilo de las cards de beneficios",
    "footer": "estilo de la barra de footer"
  }
}

Sé MUY específico con los hex codes — extráelos de la imagen con precisión. Describe cada elemento de forma que otro sistema pueda reproducir el estilo exacto sin ver la imagen original.`
