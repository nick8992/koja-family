import { ImageResponse } from 'next/og';

export const runtime = 'nodejs';
export const alt = 'Koja Family — a private gathering place for the descendants of Hanna Koja';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function OG() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#f5f1ea',
          fontFamily: 'serif',
          color: '#141e2e',
          padding: '60px',
          position: 'relative',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'radial-gradient(ellipse at 20% 20%, rgba(30, 58, 95, 0.08), transparent 50%), radial-gradient(ellipse at 80% 80%, rgba(30, 58, 95, 0.10), transparent 50%), radial-gradient(ellipse at 50% 50%, rgba(194, 106, 58, 0.05), transparent 70%)',
          }}
        />
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 140,
            height: 140,
            borderRadius: '50%',
            background: '#0f1f38',
            border: '4px solid #c8a24a',
            boxShadow: 'inset 0 0 0 4px #0f1f38, 0 8px 30px rgba(0,0,0,0.25)',
            color: '#e0bd68',
            fontSize: 78,
            marginBottom: 32,
          }}
        >
          ܩ
        </div>
        <div
          style={{
            fontSize: 84,
            fontWeight: 500,
            letterSpacing: '-1.5px',
            lineHeight: 1,
            textAlign: 'center',
          }}
        >
          The House of Koja
        </div>
        <div
          style={{
            fontSize: 28,
            fontStyle: 'italic',
            color: '#6b7890',
            marginTop: 24,
            textAlign: 'center',
            maxWidth: 900,
          }}
        >
          A private gathering place for the descendants of Hanna Koja — seven generations, one lineage.
        </div>
        <div
          style={{
            fontSize: 20,
            color: '#9a4f22',
            marginTop: 40,
            letterSpacing: '2px',
            textTransform: 'uppercase',
          }}
        >
          kojafamily.com
        </div>
      </div>
    ),
    { ...size }
  );
}
