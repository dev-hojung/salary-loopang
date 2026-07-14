import Link from 'next/link';

// TEMPORARY landing page for S0.
// S1 will replace this with the real room create/join UI.
export default function Home() {
  return (
    <div
      style={{
        display: 'flex',
        flex: 1,
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 20,
        textAlign: 'center',
        padding: 24,
      }}
    >
      <h1 style={{ fontSize: 32, fontWeight: 700 }}>루팡 길드 (Loopang Guild)</h1>
      <Link
        href="/solo"
        style={{
          display: 'inline-block',
          padding: '12px 24px',
          borderRadius: 10,
          background: '#0d7a72',
          color: '#fff',
          fontWeight: 600,
          textDecoration: 'none',
        }}
      >
        혼자 써보기 →
      </Link>
    </div>
  );
}
