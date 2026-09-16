export const fallbackSceneSrc = '/reference-art.png';

export const fallbackKitColors = {
  team: { shirt: '#0752A0', shorts: '#FFFFFF', socks: '#0752A0' },
  opponent: { shirt: '#B00020', shorts: '#111111', socks: '#B00020' },
};

const validHex = value => typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value);

export function hasConfiguredColors(source) {
  const colors = source?.colors ?? source?.kitColors ?? source?.kit?.colors ?? source ?? {};
  return Boolean(source?.primaryColor ?? colors.primary ?? colors.shirt);
}

export function resolveKitColors(source, fallback = fallbackKitColors.team) {
  const colors = source?.colors ?? source?.kitColors ?? source?.kit?.colors ?? source ?? {};
  const primary = source?.primaryColor ?? colors.primary;
  const secondary = source?.secondaryColor ?? colors.secondary;
  const tertiary = source?.tertiaryColor ?? colors.tertiary;
  const pick = (candidate, backup) => validHex(candidate) ? candidate.toUpperCase() : backup;
  return {
    shirt: pick(colors.shirt ?? colors.jersey ?? primary, fallback.shirt),
    shorts: pick(colors.shorts ?? secondary, fallback.shorts),
    socks: pick(colors.socks ?? tertiary ?? primary, fallback.socks),
  };
}

export function resolveScenePalette(team, opponent) {
  const teamKit = resolveKitColors(team, fallbackKitColors.team);
  const opponentKit = resolveKitColors(opponent, fallbackKitColors.opponent);
  const teamColors = team?.colors ?? team?.kitColors ?? team?.kit?.colors ?? team ?? {};
  return {
    primary: teamKit.shirt,
    secondary: opponent ? opponentKit.shirt : teamKit.shorts,
    accent: validHex(teamColors.tertiary ?? teamColors.accent ?? team?.accentColor)
      ? (teamColors.tertiary ?? teamColors.accent ?? team.accentColor).toUpperCase()
      : teamKit.socks,
  };
}

export function getSceneBaseSrc(scene) {
  if (!scene?.src) return null;
  return `${scene.src}/${scene.assetFormat === 'palette-v1' ? 'base.png' : 'scene-base.png'}`;
}

// Los fondos palette-v1 se pintaron asumiendo los colores por defecto de
// manifest.json (primary #D62D1E, secondary #10244A, accent #E6B83F). Sin
// esta calibración, un color de equipo real reemplaza el tono plano pero
// pierde luces/sombras del fondo y sale parchado — ver recolorPixels.
const paletteRenderConfig = {
  lightnessStrength: 0.82,
  referenceLightness: { primary: 0.44, secondary: 0.14, accent: 0.58 },
};

export function getSceneColorLayers(scene, team, opponent) {
  if (!scene?.recolorable) return [];
  if (scene.assetFormat === 'palette-v1') {
    const palette = resolveScenePalette(team, opponent);
    return ['primary', 'secondary', 'accent'].map(part => ({
      colorTarget: 'palette',
      part,
      color: palette[part],
      src: `${scene.src}/mask-${part}.png`,
      options: { referenceLightness: paletteRenderConfig.referenceLightness[part], lightnessStrength: paletteRenderConfig.lightnessStrength },
    }));
  }
  const layers = [];
  const participants = [
    ['team', 'team1', resolveKitColors(team, fallbackKitColors.team)],
    ['opponent', 'team2', resolveKitColors(opponent, fallbackKitColors.opponent)],
  ];
  for (const [colorTarget, maskTarget, colors] of participants) {
    if (!scene.colorTargets?.includes(colorTarget)) continue;
    for (const part of ['shirt', 'shorts', 'socks']) {
      layers.push({ colorTarget, part, color: colors[part], src: `${scene.src}/mask-${maskTarget}-${part}.png` });
    }
  }
  return layers;
}

export function hexToRgb(hex) {
  const normalized = validHex(hex) ? hex.slice(1) : 'FFFFFF';
  return [0, 2, 4].map(index => Number.parseInt(normalized.slice(index, index + 2), 16));
}

function rgbToHsl([r, g, b]) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l };
  const d = max - min;
  const s = l > .5 ? d / (2 - max - min) : d / (max + min);
  const h = max === r ? ((g - b) / d + (g < b ? 6 : 0))
    : max === g ? (b - r) / d + 2
    : (r - g) / d + 4;
  return { h: h / 6, s, l };
}

function hueToRgbChannel(p, q, t) {
  if (t < 0) t += 1;
  if (t > 1) t -= 1;
  if (t < 1 / 6) return p + (q - p) * 6 * t;
  if (t < 1 / 2) return q;
  if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
  return p;
}

function hslToRgb({ h, s, l }) {
  if (s === 0) { const v = l * 255; return [v, v, v]; }
  const q = l < .5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  return [hueToRgbChannel(p, q, h + 1 / 3), hueToRgbChannel(p, q, h), hueToRgbChannel(p, q, h - 1 / 3)].map(v => v * 255);
}

export function recolorPixels(basePixels, maskPixels, color, { referenceLightness, lightnessStrength = .82 } = {}) {
  const output = new Uint8ClampedArray(basePixels);
  const targetRgb = hexToRgb(color);
  const targetHsl = referenceLightness !== undefined ? rgbToHsl(targetRgb) : null;
  const [targetRed, targetGreen, targetBlue] = targetRgb;
  for (let index = 0; index < output.length; index += 4) {
    const maskIntensity = Math.max(maskPixels[index], maskPixels[index + 1], maskPixels[index + 2]) / 255;
    const maskAlpha = maskIntensity * (maskPixels[index + 3] / 255);
    if (maskAlpha <= 0) continue;
    let recoloredRed, recoloredGreen, recoloredBlue;
    if (targetHsl) {
      // Conserva las luces/sombras del fondo: desplaza el lightness del target
      // por la misma distancia (escalada) que el pixel base tenía respecto al
      // lightness con que se calibró la máscara, en vez de aplanar el color.
      const baseLightness = rgbToHsl([basePixels[index], basePixels[index + 1], basePixels[index + 2]]).l;
      const nextLightness = Math.min(1, Math.max(0, targetHsl.l + (baseLightness - referenceLightness) * lightnessStrength));
      [recoloredRed, recoloredGreen, recoloredBlue] = hslToRgb({ h: targetHsl.h, s: targetHsl.s, l: nextLightness });
    } else {
      const luminance = (basePixels[index] * .2126 + basePixels[index + 1] * .7152 + basePixels[index + 2] * .0722) / 255;
      const shade = .28 + luminance * .88;
      recoloredRed = targetRed * shade;
      recoloredGreen = targetGreen * shade;
      recoloredBlue = targetBlue * shade;
    }
    output[index] = Math.round(basePixels[index] * (1 - maskAlpha) + recoloredRed * maskAlpha);
    output[index + 1] = Math.round(basePixels[index + 1] * (1 - maskAlpha) + recoloredGreen * maskAlpha);
    output[index + 2] = Math.round(basePixels[index + 2] * (1 - maskAlpha) + recoloredBlue * maskAlpha);
  }
  return output;
}

export function applyAvailableMasks(basePixels, masks = []) {
  return masks.reduce((pixels, mask) => {
    if (!mask?.pixels || !mask?.color || mask.pixels.length !== pixels.length) return pixels;
    return recolorPixels(pixels, mask.pixels, mask.color, mask.options);
  }, new Uint8ClampedArray(basePixels));
}
