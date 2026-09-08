export interface ActionPreviewData {
  hours: number;
  goldAfter?: number;
  effect?: string;
  blockedReason?: string;
}

/** Display resolved values only. The authoritative action remains the store service. */
export function ActionPreview({ hours, goldAfter, effect, blockedReason }: ActionPreviewData) {
  return <span className="action-preview" data-blocked={!!blockedReason}>
    {blockedReason ?? `${hours}h${goldAfter !== undefined ? ` · ${goldAfter}g left` : ''}${effect ? ` · ${effect}` : ''}`}
  </span>;
}
