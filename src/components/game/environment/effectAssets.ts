import atlasUrl from '@/assets/environment/fantasy-atlas.webp';
import crowUrl from '@/assets/crow-silhouette.png';
import mistUrl from '@/assets/ui/weather-mist.webp';

export interface EffectAssets { sprites: HTMLCanvasElement[]; crow: HTMLImageElement | null; mist: HTMLImageElement | null }
let pending: Promise<EffectAssets> | undefined;
const loadImage = (url: string) => new Promise<HTMLImageElement | null>(resolve => {
  const image = new Image(); image.onload = () => resolve(image); image.onerror = () => resolve(null); image.src = url;
});

/** Generated black-matte atlas → cached alpha sprites, once. No pixel readback during frames. */
export function loadEffectAssets(): Promise<EffectAssets> {
  return pending ??= Promise.all([loadImage(atlasUrl), loadImage(crowUrl), loadImage(mistUrl)]).then(([atlas,crow,mist]) => {
    const sprites: HTMLCanvasElement[] = [];
    if (atlas) for (let index = 0; index < 16; index++) {
      const canvas = document.createElement('canvas'); canvas.width = canvas.height = 256;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) continue;
      ctx.drawImage(atlas, (index % 4) * 256, Math.floor(index / 4) * 256, 256,256,0,0,256,256);
      const pixels = ctx.getImageData(0,0,256,256);
      for (let p = 0; p < pixels.data.length; p += 4) {
        const d = pixels.data, peak = Math.max(d[p],d[p+1],d[p+2]);
        // Smoke/cloud/dust/light remain translucent. Leaves and cloth retain painted shadows.
        const alpha = index < 8 || index === 13 || index === 14 ? Math.max(0,peak-8) / 247 : Math.min(1,Math.max(0,peak-8)/32);
        d[p+3] = alpha * 255;
        if (alpha > 0 && index < 8) { d[p] = Math.min(255,d[p]/alpha); d[p+1] = Math.min(255,d[p+1]/alpha); d[p+2] = Math.min(255,d[p+2]/alpha); }
        if (index === 4) { d[p]=23; d[p+1]=27; d[p+2]=35; }
      }
      ctx.putImageData(pixels,0,0); sprites.push(canvas);
    }
    return {sprites,crow,mist};
  });
}
