export default function LoginPage({ searchParams }) {
  const next = searchParams?.next || '/';
  const error = searchParams?.error;

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'IBM Plex Sans, Segoe UI, sans-serif', color: '#E9E4D8'
    }}>
      <form method="POST" action="/api/login" style={{
        background: '#1B1F23', padding: '32px', borderRadius: '4px',
        border: '1px solid #343B41', width: '320px'
      }}>
        <h2 style={{ marginTop: 0, fontWeight: 600 }}>SITREP Login</h2>
        <p style={{ fontSize: '13px', color: '#A3AAA3', marginTop: '-8px' }}>LuvMyMotion Creator Ops Deck</p>
        <input type="hidden" name="next" value={next} />
        <input
          type="password"
          name="password"
          placeholder="App password"
          autoFocus
          style={{
            width: '100%', padding: '10px', marginBottom: '12px', boxSizing: 'border-box',
            background: '#0F1214', border: '1px solid #4A545C', color: '#fff', borderRadius: '2px'
          }}
        />
        {error && <p style={{ color: '#B23A2A', fontSize: '13px' }}>Incorrect password.</p>}
        <button type="submit" style={{
          width: '100%', padding: '10px', background: '#B85C2E', border: 'none',
          color: '#1a1200', fontWeight: 700, borderRadius: '2px', cursor: 'pointer'
        }}>Enter</button>
      </form>
    </div>
  );
}
