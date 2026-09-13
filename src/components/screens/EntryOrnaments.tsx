/** Small, reusable engraving details; labels and controls remain real HTML. */
export function EntryCorners() {
  return (
    <span className="entry-corners" aria-hidden="true">
      {[0, 1, 2, 3].map((corner) => (
        <svg key={corner} className={`entry-corner entry-corner--${corner}`} viewBox="0 0 40 40">
          <path d="M2 38V2h36l-8 8H10v20Z" fill="currentColor" />
          <path d="M7 33V7h26M15 24c0-6 9-3 9-9 0 6-9 3-9 9Z" fill="none" stroke="#fff0b4" />
          <path d="m12 12 5 2-3 3Z" fill="#69451d" />
        </svg>
      ))}
    </span>
  );
}

export function EntryDivider() {
  return (
    <span className="entry-divider" aria-hidden="true">
      <span>◆</span>
    </span>
  );
}
