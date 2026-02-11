import stoneBorderLeft from '@/assets/stone-border-left.png';
import stoneBorderRight from '@/assets/stone-border-right.png';
import leatherBorderLeft from '@/assets/leather-border-left.png';
import leatherBorderRight from '@/assets/leather-border-right.png';
import { useGameOptions } from '@/hooks/useGameOptions';
import type { BorderStyle } from '@/data/gameOptions';

interface StoneBorderFrameProps {
  side: 'left' | 'right';
  children: React.ReactNode;
}

const BORDER_IMAGES: Record<Exclude<BorderStyle, 'none'>, { left: string; right: string }> = {
  stone: { left: stoneBorderLeft, right: stoneBorderRight },
  leather: { left: leatherBorderLeft, right: leatherBorderRight },
};

export function StoneBorderFrame({ side, children }: StoneBorderFrameProps) {
  const { options } = useGameOptions();
  const borderStyle = options.borderStyle;

  if (borderStyle === 'none') {
    return (
      <div className="w-full h-full bg-background/80">
        {children}
      </div>
    );
  }

  const images = BORDER_IMAGES[borderStyle];
  const bgImage = side === 'left' ? images.left : images.right;

  return (
    <div
      className="relative w-full h-full"
      style={{
        backgroundImage: `url(${bgImage})`,
        backgroundSize: '100% 100%',
        backgroundRepeat: 'no-repeat',
      }}
    >
      <div className="absolute inset-0 p-[8%] pt-[4%] pb-[4%] overflow-hidden">
        {children}
      </div>
    </div>
  );
}
