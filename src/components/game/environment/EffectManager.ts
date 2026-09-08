export type EffectFrame = (seconds: number) => void;

/** One clock for every surface; registration and invalidation also work without animation. */
export class EffectManager {
  private surfaces = new Set<EffectFrame>();
  private frame: number | null = null;
  private last: number | null = null;
  private seconds = 0;
  private lastPaint: number | null = null;
  private running = false;
  constructor(private readonly fps = 30) {}
  register(draw: EffectFrame) {
    this.surfaces.add(draw);
    draw(this.seconds);
    this.schedule();
    return () => { this.surfaces.delete(draw); if (!this.surfaces.size) this.cancel(); };
  }
  setRunning(running: boolean) {
    this.running = running;
    if (!running) this.cancel(); else this.schedule();
  }
  invalidate() { for (const draw of this.surfaces) draw(this.seconds); }
  private schedule() {
    if (this.running && this.surfaces.size && this.frame === null) this.frame = requestAnimationFrame(this.tick);
  }
  private tick = (now: number) => {
    this.frame = null;
    if (!this.running) return;
    if (this.last !== null) this.seconds += Math.min((now - this.last) / 1000, .05);
    this.last = now;
    // Atmosphere does not need to repaint at a tablet's 60/120 Hz refresh rate.
    // Token movement has its own display-synchronised clock.
    if (this.lastPaint === null || now - this.lastPaint >= 1000 / this.fps - 1) {
      this.lastPaint = now;
      this.invalidate();
    }
    this.schedule();
  };
  private cancel() {
    if (this.frame !== null) cancelAnimationFrame(this.frame);
    this.frame = null;
    this.last = null;
    this.lastPaint = null;
  }
  dispose() { this.setRunning(false); this.surfaces.clear(); }
}
