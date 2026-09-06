export const metadata = {
  title: 'SITREP — Creator Ops Deck',
  description: 'Creator operating system for LuvMyMotion'
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, background: '#14171A' }}>{children}</body>
    </html>
  );
}
