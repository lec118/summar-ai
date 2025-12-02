import './globals.css';
import { ErrorBoundary } from './components/ErrorBoundary';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <head>
        <meta charSet="UTF-8" />
        <style>{`
          @keyframes breathe {
            0%, 100% {
              transform: scale(1);
              opacity: 1;
            }
            50% {
              transform: scale(1.3);
              opacity: 0.6;
            }
          }

          @keyframes pulse {
            0%, 100% {
              opacity: 1;
            }
            50% {
              opacity: 0.7;
            }
          }
        `}</style>
      </head>
      <body>
        <ErrorBoundary>
          <div style={{ maxWidth: 1200, margin: "0 auto", padding: 24 }}>{children}</div>
        </ErrorBoundary>
      </body>
    </html>
  );
}
