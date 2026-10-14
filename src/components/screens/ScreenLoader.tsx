/** Minimal loading fallback shown while a lazy screen chunk loads. */
export function ScreenLoader() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#1f170a',
      color: '#e8dcc8',
      fontFamily: 'serif',
    }}>
      <p style={{ opacity: 0.7 }}>Loading...</p>
    </div>
  );
}
