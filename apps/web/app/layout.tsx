export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <head>
        <meta charSet="UTF-8" />
      </head>
      <body style={{ fontFamily: "ui-sans-serif, system-ui", background: "#0b1020", color: "#eef2ff" }}>
        <div style={{ maxWidth: 960, margin: "0 auto", padding: 24 }}>{children}</div>
      </body>
    </html>
  );
}
