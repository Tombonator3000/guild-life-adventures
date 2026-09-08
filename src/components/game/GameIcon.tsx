import type { ReactNode } from 'react';
import './game-materials.css';

/** Keep the established symbols; give them the embossed metal setting from the references. */
export function GameIcon({children,semantic='brass'}: {children: ReactNode; semantic?: string}) {
  const tone=/health|heart/i.test(semantic)?'ruby':/happi|food|home/i.test(semantic)?'jade':/educ|degree|exp|magic/i.test(semantic)?'sapphire':'brass';
  return <span className="game-icon" data-tone={tone} aria-hidden="true">{children}</span>;
}
