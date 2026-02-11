import stoneBorderLeft from '@/assets/stone-border-left.png';
import stoneBorderRight from '@/assets/stone-border-right.png';

interface StoneBorderFrameProps {
  side: 'left' | 'right';
  children: React.ReactNode;
}

export function StoneBorderFrame({ side, children }: StoneBorderFrameProps) {
  const bgImage = side === 'left' ? stoneBorderLeft : stoneBorderRight;

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
