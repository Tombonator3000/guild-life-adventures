import { useRef, type ReactNode, type Ref } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from './dialog';
import { useGameOptions } from '@/hooks/useGameOptions';

interface GuildDialogProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
  description?: string;
  icon?: ReactNode;
  navigation?: ReactNode;
  footer?: ReactNode;
  className?: string;
  bodyClassName?: string;
  bodyRef?: Ref<HTMLDivElement>;
  closeLabel?: string;
}

/** The same frame, focus behaviour and readable surface for every support menu. */
export function GuildDialog({ title, onClose, children, description, icon, navigation,
  footer, className = '', bodyClassName = '', bodyRef, closeLabel = `Close ${title}`,
}: GuildDialogProps) {
  const { options } = useGameOptions();
  const opener = useRef(document.activeElement instanceof HTMLElement ? document.activeElement : null);

  return <Dialog open onOpenChange={open => { if (!open) onClose(); }}>
    <DialogContent className={`guild-dialog ${className}`} overlayClassName="guild-dialog-backdrop"
      data-text-size={options.textSize} data-fx-protect closeLabel={closeLabel}
      {...(!description ? { 'aria-describedby': undefined } : {})}
      onCloseAutoFocus={event => {
        event.preventDefault();
        if (opener.current?.isConnected) opener.current.focus();
      }}>
      <header className="guild-dialog-header">
        {icon && <span className="guild-dialog-emblem" aria-hidden="true">{icon}</span>}
        <div>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </div>
      </header>
      {navigation}
      <div ref={bodyRef} className={`guild-dialog-body ${bodyClassName}`}>{children}</div>
      {footer && <footer className="guild-dialog-footer">{footer}</footer>}
    </DialogContent>
  </Dialog>;
}
