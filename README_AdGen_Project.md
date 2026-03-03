# 🚀 AdGen — AI Landing Page & Ad Creative Generator

> SaaS para ecommerce operators hispanohablantes.
> Genera secciones de landing pages y anuncios para Meta Ads
> a partir de imágenes de producto y templates de referencia.
> Stack: Claude API + Nano Banana 2 (Gemini API) + Next.js + Supabase

---

## 🎯 Qué hace este producto

El usuario sube fotos de su producto. Claude analiza el producto y genera 5 ángulos
de venta con copy completo. El usuario elige un ángulo y un template visual de la
biblioteca compartida. Claude construye el prompt y NB2 (Gemini) genera la imagen
lista para usar en GemPages / Shopify / Meta Ads.

**El diferenciador real vs competencia (Zepol, Fluxi, ecom-magic):**
Los competidores tienen prompts fijos. Aquí Claude analiza cada producto
específicamente y construye un prompt a medida combinando el análisis del producto,
el ángulo elegido y el style guide del template. Eso es el moat.

---

## 🏗️ Arquitectura — Dos módulos

### Módulo A — Landing Page Builder (PRIORIDAD, construir primero)
Genera secciones de landing page una por una con coherencia visual.

### Módulo B — Ad Creative Generator (después)
Genera variantes de ads para Meta Ads (Story 9:16, Feed 1:1, Antes/Después).

---

## 🔄 Flujo completo — Módulo A

```
PASO 1 — Producto
  Usuario sube 1-3 fotos del producto
  Usuario escribe nombre (requerido) + descripción breve (opcional)

        ↓ llamada a Claude API

PASO 2 — Análisis y ángulos
  Claude analiza las imágenes y genera:
  - Documento del producto (categoría, audiencia, psicología del comprador)
  - 5 ángulos de venta distintos con copy completo
  Usuario selecciona 1 ángulo

        ↓ usuario navega la biblioteca

PASO 3 — Template
  Usuario ve galería de templates filtrada por tipo de sección
  En MVP: solo sección "Hero"
  Cada template tiene: preview imagen + style guide ya extraído por Claude
  Usuario selecciona 1 template → style guide se carga desde Supabase (sin Claude)
  
  Si el usuario sube un template nuevo:
  → Claude lo analiza UNA sola vez
  → Se guarda imagen en Supabase Storage + style guide en DB
  → Queda disponible para todos los usuarios

        ↓ Claude construye el prompt final

PASO 4 — Generación
  Claude combina: style guide + copy del ángulo + descripción visual del producto
  → construye el prompt para NB2
  Llamada a Gemini API (NB2) → genera imagen 9:16 2K
  Preview de la imagen generada
  Botón: Descargar PNG
```

---

## 📐 Secciones de landing disponibles

| ID | Nombre | Objetivo narrativo |
|---|---|---|
| hero | HERO | Captura atención / promesa principal |
| problema_solucion | PROBLEMA → SOLUCIÓN | Agita el dolor / presenta solución |
| antes_despues | ANTES / DESPUÉS | Muestra la transformación |
| modo_uso | MODO DE USO | Reduce fricción / explica facilidad |
| prueba_social | PRUEBA SOCIAL | Valida con reseñas + fotos reales |
| validacion_profesional | VALIDACIÓN PROFESIONAL | Autoridad (médico, experto) |
| tabla_comparativa | TABLA COMPARATIVA | Tu producto vs competencia |
| beneficios | BENEFICIOS | Resultados esperados |
| oferta | OFERTA | Urgencia + CTA final |
| faqs | FAQs | Elimina objeciones finales |

**Regla narrativa crítica:** Cada sección avanza la historia.
No repetir copy, footers ni headlines entre secciones.
Cada sección tiene su propio momento emocional y su propio CTA.

**MVP:** Solo implementar sección "hero". Las demás se agregan en V1 
con el mismo mecanismo — no requieren cambios de arquitectura.

---

## 🗄️ Base de datos — Supabase

### Tabla: templates
```sql
create table templates (
  id uuid default gen_random_uuid() primary key,
  nombre text not null,
  seccion text not null, 
  -- valores: hero | problema_solucion | antes_despues | modo_uso |
  --          prueba_social | validacion_profesional | tabla_comparativa |
  --          beneficios | oferta | faqs
  imagen_url text not null,      -- URL en Supabase Storage
  style_guide text not null,     -- texto extraído por Claude, listo para usar en prompts
  publico boolean default true,
  creado_por text,               -- sin auth por ahora, guardar IP o "anonimo"
  created_at timestamp default now()
);
```

### Supabase Storage
- Bucket: `templates` (público)
- Guardar imagen original del template subido por el usuario

### Sin auth en MVP
No hay login. Cualquiera puede ver y subir templates.
En V1 se agrega Supabase Auth.

---

## 🤖 Stack tecnológico

### Frontend + Backend
```
Next.js 14 — App Router
Tailwind CSS
TypeScript: NO (JavaScript puro para el MVP)
```

### APIs
```
Claude API (Anthropic)
  Modelo: claude-sonnet-4-6
  Uso: análisis de producto, generación de ángulos,
       extracción de style guide, construcción de prompt para NB2
  Costo: ~$0.01 por análisis completo

Gemini API (Google) — Nano Banana 2
  Modelo: gemini-3.1-flash-image-preview
  Uso: generación de imágenes
  Costo: ~$0.04 por imagen
  IMPORTANTE: Gemini API directo, NO Replicate
```

### Infraestructura
```
Supabase — DB + Storage (desde el MVP)
Vercel — deploy frontend (cuando esté listo)
```

### Variables de entorno (.env.local)
```
ANTHROPIC_API_KEY=
GEMINI_API_KEY=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

---

## 📁 Estructura de archivos

```
/app
  page.jsx                          ← UI principal (stepper 4 pasos)
  /api
    /analyze/route.js               ← Claude: análisis producto + 5 ángulos
    /analyze-template/route.js      ← Claude: extrae style guide de template nuevo
    /generate/route.js              ← Gemini NB2: genera imagen
    /templates/route.js             ← Supabase: GET lista + POST nuevo template

/lib
  prompts.js                        ← todos los prompts de Claude centralizados
  gemini.js                         ← cliente Gemini + configuración NB2
  supabase.js                       ← cliente Supabase

/public
  /templates                        ← previews de templates predefinidos (4 imágenes)
```

---

## 🧠 Estado de la aplicación (React state en cliente)

Todo el estado vive en `page.jsx`. Cada llamada a la API recibe lo que necesita
en el body del request — las API routes son stateless.

```javascript
const estadoInicial = {
  // Paso 1 — Producto
  imagenesProducto: [],        // array de base64 strings (max 3)
  nombreProducto: "",
  descripcion: "",

  // Paso 2 — Resultado de Claude
  documentoProducto: null,     // objeto con análisis completo
  angulos: [],                 // array de 5 ángulos con copy
  anguloSeleccionado: null,    // objeto del ángulo elegido

  // Paso 3 — Template
  templateSeleccionado: null,  // objeto {id, nombre, seccion, style_guide, imagen_url}
  
  // Paso 4 — Resultado
  promptGenerado: "",          // prompt que Claude construyó para NB2
  imagenGenerada: null,        // base64 o URL de la imagen de NB2
  
  // UI
  pasoActual: 1,               // 1 | 2 | 3 | 4
  cargando: false,
  error: null,
}
```

---

## 📝 Prompts de Claude

### PROMPT 1 — Análisis de producto y generación de ángulos
Usado en: `/api/analyze/route.js`

```
You are an expert ecommerce strategist and direct response 
copywriter specializing in the Spanish-speaking market 
(Spain and Latin America).

A user has uploaded 1-3 product images.
Additional info provided by user (may be empty): 
"{user_description}"

PHASE 1 — PRODUCT ANALYSIS
Analyze the product image(s) carefully and extract:
- What the product is (category, type, format)
- Physical characteristics (size, color, materials, design details)
- Likely origin/manufacturing type (branded, white label, dropshipping, handmade)
- Price range estimate (budget / mid / premium)
- Where it would be sold (Shopify, Amazon, Instagram)

PHASE 2 — MARKET ANALYSIS
Based on the product, determine:
- Primary use cases (how people use it)
- Primary and secondary target audiences
- Main competitors / alternatives in the market
- Key differentiators this product likely has
- Seasonal relevance (year-round / seasonal)

PHASE 3 — CUSTOMER PSYCHOLOGY
Identify for the most likely buyer:
- Top 3 conscious desires ("I want...")
- Top 3 hidden fears ("I'm afraid that...")
- Top 3 frustrations with current alternatives
- What success looks like after using this product
- Objections that would stop them from buying

PHASE 4 — SALES ANGLES
Generate exactly 5 distinct sales angles.
Each angle must attack a DIFFERENT psychological trigger.

Available psychological triggers (use each max once):
- Pain/Problem (direct pain point)
- Aspiration (who they want to become)
- Social proof / belonging (others like me use this)
- Fear / urgency (what happens if they don't act)
- Curiosity / novelty (something surprising)
- Value / deal (rational price justification)
- Authority / expertise (professional validation)
- Transformation (before vs after)

For each angle provide:
{
  "angle_number": 1,
  "angle_name": "short internal name",
  "psychological_trigger": "which trigger this uses",
  "one_line_concept": "the core idea in one sentence",
  "target_avatar": {
    "description": "specific person profile",
    "age_range": "XX-XX",
    "gender": "male/female/both",
    "situation": "what is happening in their life right now",
    "main_objection": "why they would hesitate to buy"
  },
  "copy": {
    "hook": "first line that stops the scroll",
    "headline": "main ad/landing headline",
    "subheadline": "supporting subtitle",
    "body_copy": "2-3 sentences of persuasive copy",
    "bullets": [
      "outcome-focused bullet 1",
      "outcome-focused bullet 2",
      "outcome-focused bullet 3"
    ],
    "cta": "call to action button text",
    "urgency_line": "optional urgency/scarcity line"
  },
  "visual_direction": {
    "scene": "what the image/ad should show",
    "mood": "emotional tone of the visual",
    "color_palette": "recommended colors",
    "hero_element": "product alone / person using it / before-after / lifestyle / close-up detail"
  }
}

CRITICAL RULES:
- Each angle completely independent (different copywriter, different customer)
- No two hooks start with same word
- Each avatar is genuinely different person
- Bullets: outcome-focused NOT feature-focused, max 10 words, "tú" form
- FORBIDDEN: generic bullets like "Alta calidad" / "Envío rápido"

PHASE 5 — PRODUCT DOCUMENT
{
  "product_name_suggested": "",
  "product_category": "",
  "one_liner": "what it is in one sentence",
  "key_benefits": ["benefit1", "benefit2", "benefit3"],
  "social_proof_template": "+X.000 [AUDIENCE] [RESULT]",
  "guarantee_suggested": "X días / money back",
  "price_positioning": "budget / mid / premium",
  "best_channels": ["Meta Ads", "TikTok", "Google"],
  "content_warnings": ["claims to avoid for legal/platform reasons"]
}

OUTPUT: Respond ONLY with valid JSON:
{
  "product_analysis": {...},
  "market_analysis": {...},
  "customer_psychology": {...},
  "sales_angles": [...],
  "product_document": {...}
}

Language: Spanish (Spain). "Tú" form.
Direct tone. No filler words. Copy ready to use as-is.
```

---

### PROMPT 2 — Extracción de style guide desde template
Usado en: `/api/analyze-template/route.js`

```
Analyze this ad/landing page image and extract a complete 
style guide in text format to replicate this visual style 
in future AI image generations.

Extract exactly:

LAYOUT:
- Overall structure (top/center/bottom zones)
- Element proportions and positioning
- Background type and treatment

TYPOGRAPHY:
- Headline: size, weight, style, alignment, color
- Subheadline: characteristics
- Special treatments (mixed colors, outlines, caps)

GRAPHIC ELEMENTS:
- Badges/pills: shape, color, position
- Icons: style, color
- Callouts: arrows, lines, labels style
- Decorative elements: glows, effects, dividers
- Seals/stamps if present

COLOR PALETTE:
- Primary color (hex if identifiable)
- Secondary and accent colors
- Background color
- Text colors

MOOD & STYLE:
- Overall aesthetic (dark/light/vibrant/minimal)
- Photography style
- Brand feel (premium/casual/technical/family)

OUTPUT FORMAT:
Return ONLY a text block starting with "MANDATORY STYLE GUIDE:"
ready to paste at the beginning of an image generation prompt.
No preamble, no explanation, just the style guide text.
```

---

### PROMPT 3 — Construcción del prompt para NB2
Usado en: `/api/generate/route.js` (Claude construye el prompt, luego se llama a Gemini)

```
You are an expert at writing image generation prompts for 
ecommerce ads using Nano Banana 2 (Gemini image generation).

You have:
1. A style guide from a reference template
2. A selected sales angle with copy
3. Product information and images

Your task: Build a detailed image generation prompt that combines
the style guide EXACTLY with the angle's copy and visual direction.

STYLE GUIDE TO APPLY:
{style_guide}

SALES ANGLE SELECTED:
- Trigger: {psychological_trigger}
- Headline: {headline}
- Subheadline: {subheadline}
- Bullets: {bullets}
- CTA: {cta}
- Visual direction: {visual_direction}

PRODUCT:
- Name: {product_name}
- Description: {product_description}
- Visual characteristics: {product_visual_characteristics}

SECTION TO GENERATE: {section_type}

Rules for the prompt you write:
- Apply the style guide structure EXACTLY (same zones, same elements)
- Use the exact copy from the angle (headline, subheadline, CTA)
- Describe the product visually using the uploaded images as reference
- Specify: aspect ratio 9:16, resolution 2K, thinking High
- End with: "Style: Professional ecommerce. No cheap dropshipping aesthetic."

OUTPUT: Return ONLY the image generation prompt, ready to send to NB2.
No explanation, no preamble.
```

---

## 🎨 Configuración NB2 para Gemini API

```javascript
// /lib/gemini.js
const generationConfig = {
  temperature: 1,
  topP: 0.95,
  topK: 40,
  maxOutputTokens: 8192,
  responseModalities: ["image", "text"],
  // thinking_level: "High" — pasar en el prompt directamente
}

// Modelo
const model = "gemini-3.1-flash-image-preview"

// En el prompt siempre incluir al final:
// "Thinking level: High. Aspect ratio: 9:16. Resolution: 2K."
```

---

## 🎨 Templates predefinidos (hardcodeados en DB al inicializar)

### Template 1 — Catálogo con callouts ⭐ MÁS VERSÁTIL
**Sección:** hero (y otras)
**Mejor para:** Cualquier producto físico con características técnicas

```
MANDATORY STYLE GUIDE:
- White/light background, outdoor lifestyle scene blurred
- Product centered large, photorealistic, 3/4 angle, drop shadow
- Brand name TOP-LEFT: bold black + small gray tagline below
- LEFT SIDE: 3 stacked category pills (dark bg, white text, colored left border)
- HEADLINE: massive bold condensed, right-aligned, black + accent color mixed, 2-3 words per line
- RIGHT SIDE: 4 circular callout icons with arrow lines pointing to product zones
  (colored circles, white icons, bold label text below each)
- FOOTER: solid colored bar + black sub-bar with CTA in << >>
- Color palette: red + black + white (adaptable)
- Clean catalog feel. NOT dark, NOT neon.
```
✅ Validado con: plantillas pádel PadelStep Pro, bicicletas Maibeiqi

---

### Template 2 — Dark / Neón con producto flotante
**Sección:** hero
**Mejor para:** Gadgets, suplementos, accesorios deportivos

```
MANDATORY STYLE GUIDE:
- Black background (#000)
- Product floating centered with neon green rim glow
- Neon green/lime (#AAFF00) for all accents
- Bold condensed italic headline, neon green, very large
- Small pill badge at top with star rating
- 4 neon green outline icons in horizontal row at bottom
- Dark footer bar with bold white text
- Dramatic studio lighting on product
- High contrast, premium feel. NOT cheap dropshipping.
```
✅ Validado con: plantillas pádel (jugador con plantilla flotante)

---

### Template 3 — Persona en acción + beneficios laterales
**Sección:** hero
**Mejor para:** Deporte, fitness, salud, lifestyle

```
MANDATORY STYLE GUIDE:
- Dark blue-black background
- Person in action LEFT side (60% width)
- 3 stacked benefit blocks RIGHT side (40% width):
  dark semi-transparent rounded rectangles,
  colored circular icon left + bold white caps text right
- Pill badge top center with star rating
- Large bold condensed white headline top
- Gold embossed circular seal bottom-right
- Dark footer bar full width, white centered text
- Dramatic sports photography lighting
- Magenta/burgundy accent color
```
✅ Validado con: jugador de pádel — output nivel Nike/Adidas

---

### Template 4 — Antes/Después con split panel
**Sección:** antes_despues
**Mejor para:** Cualquier producto con transformación visible

```
MANDATORY STYLE GUIDE:
- Dark background overall
- Vertical split: LEFT panel desaturated/B&W (ANTES), RIGHT panel vibrant color (DESPUÉS)
- Bright colored lightning bolt dividing panels
- "ANTES" label: blue pill button bottom-left
- "DESPUÉS" label: magenta pill button bottom-right
- Large bold headline top, full width
- Bottom bar split 2 columns:
  LEFT: testimony quote with avatar icon
  RIGHT: percentage stat with gold circle
- Dark footer bar, white centered tagline
```
✅ Validado con: panel B&W + rayo magenta + producto en lado "después"

---

## 🧪 Findings de testing validados (26-27 Feb 2026)

1. **NB2 > NB Pro** — mejor instruction following, text rendering, grounding
2. **Thinking: High es CRÍTICO** — layouts complejos lo requieren
3. **image_search + google_search ON** — mejora fidelidad al producto
4. **Gemini API directo > Replicate** — Replicate no soporta todos los parámetros
5. **Style guide en texto > imagen de referencia** — NB2 sigue mejor el texto
6. **Template catálogo es el más versátil** — funciona con cualquier producto físico
7. **Coherencia entre secciones confirmada** — mismo style guide = mismo visual, distinto mensaje ✅
8. **Claude genera copy listo para producción** — sin edición necesaria
9. **Advertencias legales automáticas** — Claude las genera sin que se le pida

---

## 💰 Modelo de negocio

| Plan | Precio | Generaciones | Target |
|---|---|---|---|
| Starter | €19/mes | 30 imágenes | Dropshippers pequeños |
| Pro | €49/mes | 100 imágenes | Operadores activos |
| Agency | €149/mes | Ilimitado | Agencias |

**Unit economics Plan Pro:**
- Ingresos: €49/mes
- Costo APIs (100 imgs): ~€3.70
- Margen bruto: ~92%

---

## 🛣️ Roadmap

### MVP (construir ahora)
- [ ] Setup Next.js 14 + Tailwind + Supabase
- [ ] Tabla `templates` en Supabase + Storage bucket
- [ ] Sembrar los 4 templates predefinidos en DB
- [ ] Paso 1: upload 1-3 imágenes + nombre + descripción
- [ ] Paso 2: Claude analiza → muestra documento + 5 ángulos → usuario selecciona
- [ ] Paso 3: galería de templates (solo sección "hero") → usuario selecciona
- [ ] Paso 3b: opción subir template nuevo → Claude extrae style guide → guarda en Supabase
- [ ] Paso 4: Claude construye prompt → NB2 genera imagen → preview + download

### V1
- [ ] Todas las secciones (10 tipos)
- [ ] Auth con Supabase
- [ ] Análisis de URL de competidor
- [ ] Preview de landing completa
- [ ] Export ZIP
- [ ] Stripe

### V2 — Módulo B (Ad Generator)
- [ ] 3 formatos (Story + Feed + Antes/Después)
- [ ] Batch generation

---

## 📚 Referencias

- [Gemini API — Image Generation](https://ai.google.dev/gemini-api/docs/image-generation)
- [Google AI Studio](https://aistudio.google.com)
- [Anthropic Claude API](https://docs.anthropic.com)
- [Supabase Docs](https://supabase.com/docs)
- [Zepol — competidor referencia](https://zepol.app)
- [GemPages — destino de las landings](https://gempages.net)

---

*Última actualización: 03/03/2026*
