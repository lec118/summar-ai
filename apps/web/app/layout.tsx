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
            <div className="min-h-screen relative z-10">
            {children}
          </div>
        </ErrorBoundary>
        <ToastProvider />
      </body>
    </html>
  );
}
