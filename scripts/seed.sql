-- seed.sql — ejecutar una sola vez desde Supabase Dashboard > SQL Editor
-- Después de subir las imágenes de preview al bucket "templates",
-- reemplazar las URLs y ejecutar este script.

-- Template 1 — Catálogo con callouts (hero)
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

-- Template 2 — Dark / Neón (hero)
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

-- Template 3 — Persona en acción (hero)
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

-- Template 4 — Antes/Después (antes_despues — NO visible en MVP, solo V1)
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
