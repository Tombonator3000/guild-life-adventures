import type { WeatherType } from '@/data/weather';
import type { BoardRect } from './effectAnchors';
import { CLOUD_FALLBACK_LONG_EDGE, cloudCoverage, cloudMultiplier } from './cloudShadowModel';

function insidePanel(u: number, v: number, panel: BoardRect) {
  if (panel.width <= 0 || panel.height <= 0) return false;
  const left = panel.left / 100, top = panel.top / 100;
  return u >= left && u <= left + panel.width / 100 && v >= top && v <= top + panel.height / 100;
}

export function paintCloudShadowFallback(canvas: HTMLCanvasElement, width: number, height: number, weather: WeatherType | undefined, panel: BoardRect) {
  const scale = Math.min(1, CLOUD_FALLBACK_LONG_EDGE / Math.max(1, width, height));
  canvas.width = Math.max(1, Math.round(width * scale));
  canvas.height = Math.max(1, Math.round(height * scale));
  const ctx = canvas.getContext('2d');
  if (!ctx) return false;
  const image = ctx.createImageData(canvas.width, canvas.height);
  const aspect = width / Math.max(1, height);
  for (let y = 0; y < canvas.height; y++) for (let x = 0; x < canvas.width; x++) {
    const u = (x + 0.5) / canvas.width, v = (y + 0.5) / canvas.height;
    const multiplier = insidePanel(u, v, panel)
      ? { r: 1, g: 1, b: 1 }
      : cloudMultiplier(cloudCoverage(u, v, aspect, 0), weather);
    const offset = (y * canvas.width + x) * 4;
    image.data[offset] = Math.round(multiplier.r * 255);
    image.data[offset + 1] = Math.round(multiplier.g * 255);
    image.data[offset + 2] = Math.round(multiplier.b * 255);
    image.data[offset + 3] = 255;
  }
  ctx.putImageData(image, 0, 0);
  canvas.dataset.renderer = 'canvas';
  canvas.dataset.effectTime = '0.000';
  return true;
}