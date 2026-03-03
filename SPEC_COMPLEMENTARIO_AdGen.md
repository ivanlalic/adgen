# AdGen — Especificación Complementaria para Claude Code

> Este documento complementa el README principal. Define las decisiones técnicas
> que NO deben quedar a criterio del AI coder.
> Leer AMBOS documentos antes de escribir código.

---

## 1. CORRECCIONES AL README

### Modelo de Claude — CORREGIR

```
❌ README dice: claude-sonnet-4-6
✅ Correcto:   claude-sonnet-4-5-20250929
```

Usar `claude-sonnet-4-5-20250929` en todas las llamadas a la API de Anthropic.

### Modelo de Gemini — CONFIRMAR

```
✅ gemini-3.1-flash-image-preview  (esto es "Nano Banana 2")
```

Usar el SDK oficial de Google: `@google/genai` (NO `@google-ai/generativelanguage`).

### Template 4 (Antes/Después) en el MVP

Template 4 tiene `seccion: "antes_despues"`. El MVP solo muestra sección `"hero"`.
**Decisión:** Seedear los 4 templates pero solo mostrar en la galería aquellos
cuya sección sea `"hero"` (Templates 1, 2 y 3). Template 4 queda en DB
pero invisible hasta V1.

---

## 2. FLUJO DE IMÁGENES — DECISIÓN ARQUITECTÓNICA

### Regla general: Supabase Storage primero, URLs después

Las imágenes NUNCA viajan como base64 entre pasos. El flujo es:

```
CLIENTE                          SERVIDOR
───────                          ────────
1. Usuario sube fotos
2. Resize en cliente (max 1200px lado mayor, calidad 0.8)
3. Upload directo a Supabase Storage (bucket "productos", público)
4. Recibe URLs públicas
5. Envía URLs + metadata a /api/analyze
                                 6. Descarga imágenes por URL
                                 7. Convierte a base64 para Claude API
                                 8. Claude analiza → devuelve JSON
                                 9. Responde al cliente con JSON

... después en /api/generate ...
                                 10. Claude construye prompt (solo texto)
                                 11. Descarga imágenes del producto por URL
                                 12. Envía prompt + imágenes a Gemini API
                                 13. Gemini devuelve imagen como base64
                                 14. Guarda en Supabase Storage bucket "generadas"
                                 15. Responde con URL pública al cliente
```

### Buckets de Supabase Storage

| Bucket      | Público | Contenido                        |
|-------------|---------|----------------------------------|
| `templates` | Sí      | Imágenes de templates de diseño  |
| `productos` | Sí      | Fotos subidas por usuarios       |
| `generadas` | Sí      | Imágenes output de Gemini        |

### Resize en cliente (antes de upload)

```javascript
// Usar esto en el cliente antes de subir
function resizeImage(file, maxSide = 1200, quality = 0.8) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let { width, height } = img;
      if (width > height && width > maxSide) {
        height = (height * maxSide) / width;
        width = maxSide;
      } else if (height > maxSide) {
        width = (width * maxSide) / height;
        height = maxSide;
      }
      canvas.width = width;
      canvas.height = height;
      canvas.getContext('2d').drawImage(img, 0, 0, width, height);
      canvas.toBlob(resolve, 'image/webp', quality);
    };
    img.src = URL.createObjectURL(file);
  });
}
```

### Envío de imágenes de producto a Gemini — CRÍTICO

Sí, se envían las imágenes del producto a Gemini junto con el prompt de texto.
Gemini las necesita como referencia visual para generar la imagen final.

```javascript
// En /api/generate/route.js — después de que Claude construye el prompt
const contents = [
  { text: promptDeClaude },
  // Incluir las imágenes del producto como referencia visual
  ...imagenesProducto.map(url => ({
    inlineData: {
      mimeType: "image/webp",
      data: base64DelProducto  // descargada de Supabase por URL
    }
  }))
];

const response = await ai.models.generateContent({
  model: "gemini-3.1-flash-image-preview",
  contents: contents,
  config: {
    responseModalities: ["TEXT", "IMAGE"],
  }
});
```

---

## 3. JSON SCHEMAS EXACTOS — Respuestas de Claude

### Schema del Prompt 1 — /api/analyze

Claude DEBE devolver exactamente esta estructura. Incluir esto como parte
del system prompt o como instrucción explícita de formato.

```json
{
  "product_analysis": {
    "product_type": "string",
    "category": "string",
    "physical_characteristics": "string",
    "manufacturing_type": "branded | white_label | dropshipping | handmade",
    "price_positioning": "budget | mid | premium",
    "sales_channels": ["string"]
  },
  "market_analysis": {
    "primary_use_cases": ["string"],
    "target_audiences": {
      "primary": "string",
      "secondary": "string"
    },
    "competitors": ["string"],
    "differentiators": ["string"],
    "seasonality": "year_round | seasonal"
  },
  "customer_psychology": {
    "desires": ["string", "string", "string"],
    "fears": ["string", "string", "string"],
    "frustrations": ["string", "string", "string"],
    "success_vision": "string",
    "objections": ["string"]
  },
  "sales_angles": [
    {
      "angle_number": 1,
      "angle_name": "string",
      "psychological_trigger": "string",
      "one_line_concept": "string",
      "target_avatar": {
        "description": "string",
        "age_range": "string",
        "gender": "male | female | both",
        "situation": "string",
        "main_objection": "string"
      },
      "copy": {
        "hook": "string",
        "headline": "string",
        "subheadline": "string",
        "body_copy": "string",
        "bullets": ["string", "string", "string"],
        "cta": "string",
        "urgency_line": "string"
      },
      "visual_direction": {
        "scene": "string",
        "mood": "string",
        "color_palette": "string",
        "hero_element": "string"
      }
    }
  ],
  "product_document": {
    "product_name_suggested": "string",
    "product_category": "string",
    "one_liner": "string",
    "key_benefits": ["string", "string", "string"],
    "social_proof_template": "string",
    "guarantee_suggested": "string",
    "price_positioning": "string",
    "best_channels": ["string"],
    "content_warnings": ["string"]
  }
}
```

### Parsing robusto del JSON de Claude

Claude a veces envuelve JSON en markdown. SIEMPRE usar este helper:

```javascript
// /lib/parseClaudeJSON.js
export function parseClaudeJSON(text) {
  // Intentar parse directo
  try {
    return JSON.parse(text);
  } catch (e) {
    // Quitar bloques markdown
    const cleaned = text
      .replace(/```json\s*/g, '')
      .replace(/```\s*/g, '')
      .trim();
    try {
      return JSON.parse(cleaned);
    } catch (e2) {
      // Último intento: extraer el primer { ... } completo
      const match = cleaned.match(/\{[\s\S]*\}/);
      if (match) {
        return JSON.parse(match[0]);
      }
      throw new Error('No se pudo parsear la respuesta de Claude');
    }
  }
}
```

---

## 4. API ROUTES — Contratos de entrada/salida

### POST /api/analyze

```
REQUEST:
{
  "imagenes_urls": ["https://...supabase.../producto1.webp"],  // 1-3 URLs
  "nombre_producto": "string",      // requerido
  "descripcion": "string"           // opcional, puede ser ""
}

RESPONSE 200:
{
  "success": true,
  "data": { ... }   // el JSON completo del schema de arriba
}

RESPONSE 4xx/5xx:
{
  "success": false,
  "error": "mensaje legible para el usuario",
  "code": "CLAUDE_TIMEOUT" | "CLAUDE_PARSE_ERROR" | "INVALID_INPUT" | "RATE_LIMIT"
}
```

### POST /api/analyze-template

```
REQUEST:
  FormData con campo "imagen" (archivo) + campo "nombre" (string) + campo "seccion" (string)
  
  El servidor sube la imagen a Supabase Storage y luego la manda a Claude.

RESPONSE 200:
{
  "success": true,
  "template": {
    "id": "uuid",
    "nombre": "string",
    "seccion": "string",
    "imagen_url": "https://...supabase...",
    "style_guide": "MANDATORY STYLE GUIDE: ..."
  }
}
```

### POST /api/generate

```
REQUEST:
{
  "style_guide": "string",           // del template seleccionado
  "angulo": { ... },                 // el ángulo completo seleccionado
  "producto": {
    "nombre": "string",
    "descripcion": "string",
    "imagenes_urls": ["string"]       // URLs de Supabase
  },
  "seccion": "hero"                   // tipo de sección
}

RESPONSE 200:
{
  "success": true,
  "imagen_url": "https://...supabase.../generadas/xxx.png",
  "prompt_usado": "string"            // el prompt que Claude construyó (para debug)
}
```

### GET /api/templates?seccion=hero

```
RESPONSE 200:
{
  "success": true,
  "templates": [
    {
      "id": "uuid",
      "nombre": "string",
      "seccion": "hero",
      "imagen_url": "https://...",
      "style_guide": "MANDATORY STYLE GUIDE: ..."
    }
  ]
}
```

---

## 5. TIMEOUTS Y VERCEL — DECISIÓN CRÍTICA

### El problema

Vercel Hobby (free) tiene estos límites:
- Serverless Functions: **10 segundos** de timeout por defecto
- Con Fluid Compute habilitado: hasta **60 segundos**
- Request body máximo: **4.5 MB**

Las llamadas API tardan:
- Claude análisis con imágenes: **10-30 segundos**
- Claude construcción de prompt: **3-8 segundos**
- Gemini generación de imagen: **15-45 segundos**

### Solución: Fluid Compute + Streaming

1. **Habilitar Fluid Compute** en el proyecto de Vercel (settings > Functions > Enable Fluid Compute)

2. **Configurar maxDuration** en cada route:
```javascript
// /app/api/analyze/route.js
export const maxDuration = 60;  // segundos

// /app/api/generate/route.js
export const maxDuration = 60;  // segundos
```

3. **Implementar indicadores de progreso en el frontend:**
```
Paso 2: "Analizando tu producto... esto puede tardar ~20 segundos"
         [barra de progreso animada, no real]
         
Paso 4: "Generando tu imagen... esto puede tardar ~30 segundos"
         [barra de progreso animada, no real]
```

4. **Si 60s no alcanza para /api/generate** (Claude + Gemini en secuencia):
   Partir en 2 llamadas:
   - `/api/build-prompt` → Claude construye el prompt (5-10s)
   - `/api/generate-image` → Gemini genera la imagen (15-45s)
   
   El frontend llama a ambas en secuencia.

---

## 6. MANEJO DE ERRORES

### Estrategia por endpoint

```javascript
// /lib/apiCall.js — helper unificado
export async function safeApiCall(endpoint, body, options = {}) {
  const { maxRetries = 1, timeoutMs = 55000 } = options;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), timeoutMs);
      
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      
      clearTimeout(timeout);
      const data = await res.json();
      
      if (!data.success) {
        if (data.code === 'RATE_LIMIT' && attempt < maxRetries) {
          await new Promise(r => setTimeout(r, 2000 * (attempt + 1)));
          continue;
        }
        throw new Error(data.error || 'Error desconocido');
      }
      
      return data;
    } catch (err) {
      if (attempt === maxRetries) throw err;
    }
  }
}
```

### Errores específicos a manejar

| Error                  | Causa                                        | Acción                                       |
|------------------------|----------------------------------------------|----------------------------------------------|
| Claude 429             | Rate limit Anthropic                         | Retry 1x con delay 3s, luego mostrar error   |
| Claude timeout         | Análisis pesado (3 imágenes grandes)         | Mostrar "Intentá con menos imágenes"         |
| Claude JSON inválido   | Respuesta mal formateada                     | Retry 1x, luego mostrar error genérico       |
| Gemini 429             | Rate limit Google (muy bajo en free tier)    | Mostrar "Demasiadas generaciones, esperá 1m" |
| Gemini content blocked | Política de contenido de Google              | Mostrar "Gemini rechazó esta combinación. Probá otro ángulo o template" |
| Gemini sin imagen      | Response vino con texto pero sin imagen      | Mostrar "No se pudo generar. Intentá de nuevo"|
| Supabase upload fail   | Storage lleno o error de red                 | Retry 1x, luego error                        |
| Vercel timeout (504)   | Función excedió 60s                          | Mostrar "Tardó demasiado. Intentá de nuevo"  |

### Validación de respuesta de Gemini

```javascript
// En /api/generate/route.js
const response = await ai.models.generateContent({ ... });

const imagePart = response.candidates?.[0]?.content?.parts?.find(
  p => p.inlineData?.mimeType?.startsWith('image/')
);

if (!imagePart) {
  // Gemini respondió pero sin imagen
  const textPart = response.candidates?.[0]?.content?.parts?.find(p => p.text);
  return Response.json({
    success: false,
    error: textPart?.text || 'Gemini no generó imagen. Intentá de nuevo.',
    code: 'GEMINI_NO_IMAGE'
  }, { status: 422 });
}
```

---

## 7. SEGURIDAD Y PROTECCIÓN DE API KEYS

### API keys NUNCA en el cliente

Todas las API keys van en variables de entorno del servidor (`.env.local`).
Las rutas `/api/*` de Next.js corren server-side → las keys nunca se exponen.

`NEXT_PUBLIC_` solo para Supabase URL y anon key (que son públicas por diseño).

```
# .env.local
ANTHROPIC_API_KEY=sk-ant-...          # SOLO servidor
GEMINI_API_KEY=AI...                   # SOLO servidor
NEXT_PUBLIC_SUPABASE_URL=https://...   # público OK
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...   # público OK (RLS protege)
SUPABASE_SERVICE_ROLE_KEY=eyJ...       # SOLO servidor
```

### Rate limiting por IP (sin auth)

Implementar rate limiting simple con un Map en memoria.
Para MVP esto es suficiente (se resetea en cada deploy, lo cual es aceptable).

```javascript
// /lib/rateLimit.js
const requests = new Map();

export function rateLimit(ip, { maxRequests = 10, windowMs = 60000 } = {}) {
  const now = Date.now();
  const windowStart = now - windowMs;
  
  if (!requests.has(ip)) {
    requests.set(ip, []);
  }
  
  const timestamps = requests.get(ip).filter(t => t > windowStart);
  
  if (timestamps.length >= maxRequests) {
    return { allowed: false, retryAfterMs: timestamps[0] + windowMs - now };
  }
  
  timestamps.push(now);
  requests.set(ip, timestamps);
  return { allowed: true };
}

// Limpiar entradas viejas cada 5 minutos
setInterval(() => {
  const cutoff = Date.now() - 300000;
  for (const [ip, times] of requests) {
    const filtered = times.filter(t => t > cutoff);
    if (filtered.length === 0) requests.delete(ip);
    else requests.set(ip, filtered);
  }
}, 300000);
```

### Límites por endpoint

| Endpoint             | Rate limit        | Por qué                        |
|----------------------|-------------------|--------------------------------|
| /api/analyze         | 5 req/min por IP  | Caro (Claude + imágenes)       |
| /api/analyze-template| 3 req/min por IP  | Caro (Claude + imagen)         |
| /api/generate        | 5 req/min por IP  | Caro (Claude + Gemini)         |
| /api/templates       | 30 req/min por IP | Solo lectura DB, barato        |

### Supabase Storage — protección

```sql
-- Política para bucket "productos": cualquiera puede subir, pero max 5MB
-- (configurar en Supabase Dashboard > Storage > Bucket policies)

-- Política para bucket "templates": cualquiera puede subir
-- (se modera manualmente en V1)

-- Política para bucket "generadas": solo el server (service_role) puede escribir
-- Los usuarios solo leen (públicas)
```

### Validación de inputs en cada API route

```javascript
// En TODA API route, primer paso:
function validateAnalyzeRequest(body) {
  const errors = [];
  
  if (!body.nombre_producto?.trim()) {
    errors.push('Nombre del producto es requerido');
  }
  if (!Array.isArray(body.imagenes_urls) || body.imagenes_urls.length === 0) {
    errors.push('Al menos 1 imagen es requerida');
  }
  if (body.imagenes_urls?.length > 3) {
    errors.push('Máximo 3 imágenes');
  }
  // Validar que las URLs son de nuestro Supabase
  const supabaseHost = process.env.NEXT_PUBLIC_SUPABASE_URL;
  for (const url of body.imagenes_urls || []) {
    if (!url.startsWith(supabaseHost)) {
      errors.push('Las imágenes deben estar alojadas en nuestro storage');
    }
  }
  
  return errors;
}
```

---

## 8. SEED DE LA BASE DE DATOS

"Seedear" = meter datos iniciales en la DB para que la app funcione desde el día 1.

### Archivo: /scripts/seed.sql

```sql
-- Ejecutar una sola vez desde Supabase Dashboard > SQL Editor
-- O con: npx supabase db push (si se usa Supabase CLI)

-- Crear la tabla si no existe
create table if not exists templates (
  id uuid default gen_random_uuid() primary key,
  nombre text not null,
  seccion text not null,
  imagen_url text not null,
  style_guide text not null,
  publico boolean default true,
  creado_por text default 'system',
  created_at timestamp default now()
);

-- Template 1 — Catálogo con callouts
insert into templates (nombre, seccion, imagen_url, style_guide, creado_por) values (
  'Catálogo con callouts',
  'hero',
  'REEMPLAZAR_CON_URL_DE_STORAGE',
  'MANDATORY STYLE GUIDE:
- White/light background, outdoor lifestyle scene blurred
- Product centered large, photorealistic, 3/4 angle, drop shadow
- Brand name TOP-LEFT: bold black + small gray tagline below
- LEFT SIDE: 3 stacked category pills (dark bg, white text, colored left border)
- HEADLINE: massive bold condensed, right-aligned, black + accent color mixed, 2-3 words per line
- RIGHT SIDE: 4 circular callout icons with arrow lines pointing to product zones
  (colored circles, white icons, bold label text below each)
- FOOTER: solid colored bar + black sub-bar with CTA in << >>
- Color palette: red + black + white (adaptable)
- Clean catalog feel. NOT dark, NOT neon.',
  'system'
);

-- Template 2 — Dark / Neón
insert into templates (nombre, seccion, imagen_url, style_guide, creado_por) values (
  'Dark / Neón con producto flotante',
  'hero',
  'REEMPLAZAR_CON_URL_DE_STORAGE',
  'MANDATORY STYLE GUIDE:
- Black background (#000)
- Product floating centered with neon green rim glow
- Neon green/lime (#AAFF00) for all accents
- Bold condensed italic headline, neon green, very large
- Small pill badge at top with star rating
- 4 neon green outline icons in horizontal row at bottom
- Dark footer bar with bold white text
- Dramatic studio lighting on product
- High contrast, premium feel. NOT cheap dropshipping.',
  'system'
);

-- Template 3 — Persona en acción
insert into templates (nombre, seccion, imagen_url, style_guide, creado_por) values (
  'Persona en acción + beneficios',
  'hero',
  'REEMPLAZAR_CON_URL_DE_STORAGE',
  'MANDATORY STYLE GUIDE:
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
- Magenta/burgundy accent color',
  'system'
);

-- Template 4 — Antes/Después (NO se muestra en MVP, solo sección hero)
insert into templates (nombre, seccion, imagen_url, style_guide, creado_por) values (
  'Antes/Después split panel',
  'antes_despues',
  'REEMPLAZAR_CON_URL_DE_STORAGE',
  'MANDATORY STYLE GUIDE:
- Dark background overall
- Vertical split: LEFT panel desaturated/B&W (ANTES), RIGHT panel vibrant color (DESPUÉS)
- Bright colored lightning bolt dividing panels
- "ANTES" label: blue pill button bottom-left
- "DESPUÉS" label: magenta pill button bottom-right
- Large bold headline top, full width
- Bottom bar split 2 columns:
  LEFT: testimony quote with avatar icon
  RIGHT: percentage stat with gold circle
- Dark footer bar, white centered tagline',
  'system'
);
```

### Proceso de setup:

1. Crear proyecto en Supabase
2. Crear los 3 buckets en Storage: `templates`, `productos`, `generadas` (todos públicos)
3. Subir las 4 imágenes de preview de templates al bucket `templates`
4. Copiar las URLs públicas de cada imagen
5. Reemplazar `REEMPLAZAR_CON_URL_DE_STORAGE` en el SQL
6. Ejecutar el SQL en el SQL Editor de Supabase

---

## 9. ESTRUCTURA DE COMPONENTES (no todo en page.jsx)

```
/app
  page.jsx                    ← Solo orquesta el stepper y el estado global
  /api/...                    ← (según README)

/components
  Stepper.jsx                 ← Barra de progreso visual (pasos 1-4)
  Step1Upload.jsx             ← Upload de imágenes + nombre + descripción
  Step2Angles.jsx             ← Muestra análisis + 5 ángulos para elegir
  Step3Templates.jsx          ← Galería de templates + modal para subir nuevo
  Step4Generate.jsx           ← Generación + preview + descarga
  TemplateCard.jsx            ← Card individual de template en la galería
  AngleCard.jsx               ← Card individual de ángulo de venta
  ImageUploader.jsx           ← Componente de upload con resize y preview
  LoadingOverlay.jsx          ← Overlay con mensaje y animación de progreso
  ErrorMessage.jsx            ← Componente de error reutilizable

/lib
  prompts.js                  ← (según README)
  gemini.js                   ← (según README)
  supabase.js                 ← (según README)
  parseClaudeJSON.js          ← Parser robusto de JSON
  rateLimit.js                ← Rate limiter por IP
  apiCall.js                  ← Helper de fetch con retry/timeout
  resizeImage.js              ← Resize de imágenes en cliente
  uploadToStorage.js          ← Upload a Supabase Storage
```

---

## 10. ESTADO DE LA APP — ACTUALIZADO

```javascript
// page.jsx — estado global
const [state, setState] = useState({
  // Paso 1
  imagenesUrls: [],            // URLs de Supabase Storage (NO base64)
  nombreProducto: "",
  descripcion: "",

  // Paso 2
  analisisCompleto: null,      // el JSON completo de Claude
  anguloSeleccionado: null,    // el objeto del ángulo elegido

  // Paso 3
  templateSeleccionado: null,  // {id, nombre, seccion, style_guide, imagen_url}
  
  // Paso 4
  imagenGeneradaUrl: null,     // URL de Supabase Storage
  promptUsado: "",             // para debug/transparencia

  // UI
  pasoActual: 1,
  cargando: false,
  mensajeCarga: "",            // "Analizando tu producto..."
  error: null,
});
```

**Cambios vs README:**
- `imagenesProducto: []` (base64) → `imagenesUrls: []` (URLs de Storage)
- `documentoProducto` + `angulos` → `analisisCompleto` (un solo objeto, todo junto)
- `imagenGenerada` (base64) → `imagenGeneradaUrl` (URL de Storage)
- Agregado `mensajeCarga` para UX durante las esperas largas
- Agregado `promptUsado` para transparencia y debugging

---

## 11. PROMPT 3 — NOTA SOBRE "NANO BANANA 2"

Claude no sabe qué es "Nano Banana 2". Reemplazar la referencia en el Prompt 3:

```
❌ "...image generation prompts for Nano Banana 2 (Gemini image generation)"
✅ "...image generation prompts for Google Gemini's native image generation
   (model: gemini-3.1-flash-image-preview)"
```

Agregar al final del Prompt 3 estas instrucciones de optimización basadas
en la documentación oficial de Gemini:

```
IMPORTANT GUIDELINES FOR GEMINI IMAGE GENERATION:
- Describe the SCENE in detail, don't just list keywords
- The model follows natural language descriptions better than keyword lists
- Always specify: aspect ratio 9:16, high quality
- Include "Thinking level: High" for complex layouts
- Product images are being provided as visual reference — 
  describe how the product should appear in the generated image
  but rely on the reference photos for accuracy
- End with: "Style: Professional ecommerce. No cheap dropshipping aesthetic."
```

---

## 12. CHECKLIST DE ARRANQUE

Antes de escribir la primera línea de código:

- [ ] Crear proyecto en Supabase → copiar URL + keys
- [ ] Crear los 3 buckets de Storage (templates, productos, generadas)
- [ ] Subir las 4 imágenes de preview al bucket templates
- [ ] Ejecutar seed.sql con las URLs correctas
- [ ] Obtener API key de Anthropic
- [ ] Obtener API key de Gemini (AI Studio)
- [ ] Crear proyecto Next.js 14 con App Router
- [ ] Instalar: `@anthropic-ai/sdk`, `@google/genai`, `@supabase/supabase-js`, `tailwindcss`
- [ ] Configurar .env.local con las 5 variables
- [ ] Habilitar Fluid Compute en Vercel (si ya hay deploy)
- [ ] Testear manualmente cada API route antes de conectar al frontend

---

## 13. QUÉ SE DEFINE SOBRE LA MARCHA (Y ESO ESTÁ BIEN)

Estas cosas NO necesitan definición previa — se iteran:

- Diseño visual exacto del UI (colores, espacios, tipografía)
- Wording exacto de los mensajes de error
- Orden y layout de los ángulos en Step 2
- Tamaño del grid de templates en Step 3
- Si la descarga es directa o abre nueva pestaña
- Ajustes finos a los prompts de Claude (se refinan con testing)
- Si agregar un botón "Regenerar" en Step 4
- Detalles de animación/transición entre pasos

---

*Este documento se actualiza conforme se toman decisiones durante el desarrollo.*
