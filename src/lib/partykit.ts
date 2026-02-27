// PartyKit configuration for the public game lobby browser.
// Set VITE_PARTYKIT_HOST in .env.local to enable.
//
// Development:  VITE_PARTYKIT_HOST=localhost:1999   (run: npx partykit dev)
// Production:   VITE_PARTYKIT_HOST=guild-life-adventures.<your-name>.partykit.dev

export function isPartykitConfigured(): boolean {
  return !!(import.meta.env.VITE_PARTYKIT_HOST as string | undefined);
}

export function getPartykitHost(): string {
  return (import.meta.env.VITE_PARTYKIT_HOST as string) ?? "";
}
