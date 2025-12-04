import './globals.css';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ToastProvider } from './components/ToastProvider';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <head>
        <meta charSet="UTF-8" />
      </head>
      <body>
        <ErrorBoundary>
          <div style={{
            maxWidth: 1200,
            margin: "0 auto",
            padding: "40px 24px",
            minHeight: "100vh",
            position: "relative",
            zIndex: 1
          }}>
            {children}
          </div>
        </ErrorBoundary>
        <ToastProvider />
      </body>
    </html>
  );
}
