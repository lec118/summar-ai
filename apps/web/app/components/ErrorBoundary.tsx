'use client';

import { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div style={{
          padding: 48,
          textAlign: 'center',
          background: '#0f1530',
          borderRadius: 16,
          margin: 32,
          border: '2px solid #e74c3c'
        }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>💥</div>
          <h2 style={{ fontSize: 24, marginBottom: 16, color: '#e74c3c' }}>
            문제가 발생했습니다
          </h2>
          <p style={{ opacity: 0.7, marginBottom: 24, fontSize: 14 }}>
            {this.state.error?.message || '알 수 없는 오류'}
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
            <button
              onClick={() => window.location.reload()}
              style={{
                padding: '12px 24px',
                background: '#5865f2',
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                cursor: 'pointer',
                fontSize: 14,
                fontWeight: 600
              }}
            >
              새로고침
            </button>
            <button
              onClick={() => window.history.back()}
              style={{
                padding: '12px 24px',
                background: '#2c2f33',
                color: '#fff',
                border: '1px solid #40444b',
                borderRadius: 8,
                cursor: 'pointer',
                fontSize: 14,
                fontWeight: 600
              }}
            >
              뒤로 가기
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
