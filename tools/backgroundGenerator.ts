export type InzoiBackdropPresetId =
  | 'dowon_skyline'
  | 'bliss_bay_sunset'
  | 'zoi_studio_grid';

export interface InzoiBackdropPreset {
  id: InzoiBackdropPresetId;
  label: string;
  description: string;
}

export const INZOI_BACKDROP_PRESETS: readonly InzoiBackdropPreset[] = [
  {
    id: 'dowon_skyline',
    label: 'Dowon Neon Dusk',
    description: 'Urban high-rise silhouette with cool cyan and mint street reflections',
  },
  {
    id: 'bliss_bay_sunset',
    label: 'Bliss Bay Promenade',
    description: 'Coastal twilight horizon with teal ocean shimmer and soft violet sky',
  },
  {
    id: 'zoi_studio_grid',
    label: 'ZOI Studio Canvas',
    description: 'Minimalist architectural blueprint grid with soft radial studio lighting',
  },
] as const;

/**
 * Generates an inZOI-styled 16:9 background data URL on an HTML5 canvas.
 */
export function generateInzoiBackgroundDataUrl(
  preset: InzoiBackdropPresetId
): string {
  const canvas = document.createElement('canvas');
  canvas.width = 1280;
  canvas.height = 720;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  if (preset === 'dowon_skyline') {
    const sky = ctx.createLinearGradient(0, 0, 0, 720);
    sky.addColorStop(0, '#070B12');
    sky.addColorStop(0.55, '#0F1B2D');
    sky.addColorStop(1, '#132A38');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, 1280, 720);

    // Subtle atmospheric glow
    const glow = ctx.createRadialGradient(920, 220, 40, 920, 220, 520);
    glow.addColorStop(0, 'rgba(45, 212, 191, 0.22)');
    glow.addColorStop(0.5, 'rgba(56, 189, 248, 0.08)');
    glow.addColorStop(1, 'rgba(7, 11, 18, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, 1280, 720);

    // High-rise skyline silhouettes
    const towers = [
      { x: 60, w: 120, h: 360 },
      { x: 200, w: 95, h: 430 },
      { x: 320, w: 150, h: 310 },
      { x: 500, w: 130, h: 480 },
      { x: 660, w: 110, h: 380 },
      { x: 800, w: 165, h: 520 },
      { x: 990, w: 125, h: 410 },
      { x: 1135, w: 110, h: 340 },
    ];
    for (const t of towers) {
      ctx.fillStyle = '#09101B';
      ctx.fillRect(t.x, 720 - t.h, t.w, t.h);
      ctx.strokeStyle = 'rgba(45, 212, 191, 0.25)';
      ctx.lineWidth = 1;
      ctx.strokeRect(t.x, 720 - t.h, t.w, t.h);

      // Lit studio windows
      for (let wy = 720 - t.h + 24; wy < 680; wy += 28) {
        for (let wx = t.x + 16; wx < t.x + t.w - 20; wx += 24) {
          if ((wx + wy) % 3 === 0) {
            ctx.fillStyle =
              (wx + wy) % 6 === 0
                ? 'rgba(45, 212, 191, 0.45)'
                : 'rgba(56, 189, 248, 0.35)';
            ctx.fillRect(wx, wy, 10, 14);
          }
        }
      }
    }
  } else if (preset === 'bliss_bay_sunset') {
    const grad = ctx.createLinearGradient(0, 0, 1280, 720);
    grad.addColorStop(0, '#0B1325');
    grad.addColorStop(0.45, '#16243E');
    grad.addColorStop(0.78, '#133848');
    grad.addColorStop(1, '#0D2630');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 1280, 720);

    const sun = ctx.createRadialGradient(640, 390, 20, 640, 390, 360);
    sun.addColorStop(0, 'rgba(56, 189, 248, 0.28)');
    sun.addColorStop(0.5, 'rgba(45, 212, 191, 0.14)');
    sun.addColorStop(1, 'rgba(11, 19, 37, 0)');
    ctx.fillStyle = sun;
    ctx.fillRect(0, 0, 1280, 720);

    // Horizon & water reflection lines
    ctx.strokeStyle = 'rgba(45, 212, 191, 0.32)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, 460);
    ctx.lineTo(1280, 460);
    ctx.stroke();

    for (let y = 485; y < 700; y += 22) {
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.16)';
      ctx.beginPath();
      ctx.moveTo(220, y);
      ctx.lineTo(1060, y);
      ctx.stroke();
    }
  } else {
    // zoi_studio_grid
    const bg = ctx.createRadialGradient(640, 360, 50, 640, 360, 750);
    bg.addColorStop(0, '#131E2E');
    bg.addColorStop(1, '#080C13');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, 1280, 720);

    ctx.strokeStyle = 'rgba(45, 212, 191, 0.10)';
    ctx.lineWidth = 1;
    for (let x = 0; x <= 1280; x += 48) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, 720);
      ctx.stroke();
    }
    for (let y = 0; y <= 720; y += 48) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(1280, y);
      ctx.stroke();
    }
  }

  return canvas.toDataURL('image/jpeg', 0.86);
}

/**
 * Generates an inZOI-styled city screenshot data URL for sample gallery testing.
 */
export function generateSampleCityScreenshot(index: number): string {
  const canvas = document.createElement('canvas');
  canvas.width = 960;
  canvas.height = 540;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  const palettes = [
    ['#090D16', '#132032', '#2DD4BF'],
    ['#0B1220', '#16263B', '#38BDF8'],
    ['#0E1424', '#1E293B', '#5EEAD4'],
  ];
  const [c1, c2, accent] = palettes[index % palettes.length];

  const grad = ctx.createLinearGradient(0, 0, 960, 540);
  grad.addColorStop(0, c1);
  grad.addColorStop(1, c2);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 960, 540);

  ctx.strokeStyle = 'rgba(45, 212, 191, 0.08)';
  ctx.lineWidth = 1;
  for (let x = 60; x < 960; x += 60) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, 540);
    ctx.stroke();
  }
  for (let y = 60; y < 540; y += 60) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(960, y);
    ctx.stroke();
  }

  ctx.fillStyle = 'rgba(9, 13, 20, 0.82)';
  ctx.fillRect(80, 220, 140, 320);
  ctx.fillRect(250, 160, 180, 380);
  ctx.fillRect(460, 250, 160, 290);
  ctx.fillRect(650, 130, 210, 410);

  ctx.fillStyle = accent;
  for (let bx = 275; bx < 405; bx += 35) {
    for (let by = 195; by < 480; by += 45) {
      if ((bx + by) % 2 === 0) {
        ctx.fillRect(bx, by, 16, 22);
      }
    }
  }
  for (let bx = 680; bx < 830; bx += 40) {
    for (let by = 170; by < 490; by += 50) {
      if ((bx * by) % 3 !== 0) {
        ctx.fillRect(bx, by, 18, 24);
      }
    }
  }

  ctx.strokeStyle = accent;
  ctx.lineWidth = 3;
  ctx.strokeRect(24, 24, 912, 492);

  return canvas.toDataURL('image/jpeg', 0.9);
}

/**
 * Generates an inZOI-styled procedural portrait/emblem source canvas for testing or placeholder framing.
 */
export function createProceduralSourceImage(title: string): string {
  const canvas = document.createElement('canvas');
  canvas.width = 900;
  canvas.height = 1200;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  // Rich inZOI slate-navy & cyan gradient backdrop
  const grad = ctx.createLinearGradient(0, 0, 900, 1200);
  grad.addColorStop(0, '#090D14');
  grad.addColorStop(0.5, '#132032');
  grad.addColorStop(1, '#070A10');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 900, 1200);

  // Subtle architectural studio grid lines
  ctx.strokeStyle = 'rgba(45, 212, 191, 0.14)';
  ctx.lineWidth = 2;
  for (let x = 90; x < 900; x += 90) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, 1200);
    ctx.stroke();
  }
  for (let y = 90; y < 1200; y += 90) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(900, y);
    ctx.stroke();
  }

  // Central geometric monolith / portrait silhouette
  ctx.strokeStyle = '#2DD4BF';
  ctx.lineWidth = 3;
  ctx.strokeRect(180, 160, 540, 880);

  ctx.beginPath();
  ctx.arc(450, 460, 150, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(45, 212, 191, 0.12)';
  ctx.fill();
  ctx.stroke();

  // Silhouette shoulders
  ctx.beginPath();
  ctx.moveTo(230, 960);
  ctx.quadraticCurveTo(450, 680, 670, 960);
  ctx.closePath();
  ctx.fillStyle = 'rgba(56, 189, 248, 0.16)';
  ctx.fill();
  ctx.stroke();

  // Initials / Title
  const cleanTitle = (title || 'OC').trim();
  const initials =
    cleanTitle
      .split(/\s+/)
      .map((w) => w[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() || 'OC';

  ctx.fillStyle = '#F3F4F6';
  ctx.font = 'bold 96px Outfit, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(initials, 450, 460);

  return canvas.toDataURL('image/jpeg', 0.92);
}


