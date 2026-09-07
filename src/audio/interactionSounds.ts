import { sfxManager, SFX_LIBRARY, type SFXId } from './sfxManager';

/** Fallback only: action handlers with their own feedback keep priority. */
export function installInteractionSounds(root: Document = document) {
  const pending = new Set<ReturnType<typeof setTimeout>>();
  const onClick = (event: MouseEvent) => {
    const target = event.target instanceof Element ? event.target.closest<HTMLElement>('button, summary, [role="button"], [role="tab"]') : null;
    if (!target || target.matches(':disabled,[aria-disabled="true"]') || target.closest('[inert]')) return;
    const revision = sfxManager.playRevision;
    const declared = target.closest<HTMLElement>('[data-ui-sound]')?.dataset.uiSound;
    const sound: SFXId = declared && declared in SFX_LIBRARY ? declared as SFXId
      : target.getAttribute('role') === 'tab' || target.tagName === 'SUMMARY' ? 'menu-open' : 'button-click';
    // Run after React handlers, including controls that stop bubbling or unmount.
    const timer = setTimeout(() => {
      pending.delete(timer);
      if (!event.defaultPrevented && declared !== 'off' && sfxManager.playRevision === revision) sfxManager.play(sound);
    }, 0);
    pending.add(timer);
  };
  root.addEventListener('click', onClick, true);
  return () => { root.removeEventListener('click', onClick, true); pending.forEach(clearTimeout); };
}
