'use client';

import React, { Component, ReactNode, ErrorInfo } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: (error: Error, reset: () => void) => ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * Error Boundary Component
 * Catches React errors in child components and displays a fallback UI
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  resetError = (): void => {
    this.setState({
      hasError: false,
      error: null,
    });
  };

  render(): ReactNode {
    if (this.state.hasError && this.state.error) {
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.resetError);
      }

      // Default fallback UI
      return (
        <div className="flex flex-col items-center justify-center p-8 bg-red-900/20 border-2 border-red-500 rounded-lg">
          <div className="text-red-400 text-xl font-bold mb-2" style={{ fontFamily: 'Cinzel, serif' }}>
            ⚠️ Something went wrong
          </div>
          <p className="text-sm text-gray-300 mb-4" style={{ fontFamily: 'Lora, serif' }}>
            {this.state.error.message}
          </p>
          <button
            onClick={this.resetError}
            className="px-4 py-2 bg-[var(--empire-gold)] text-gray-900 font-bold rounded-lg hover:bg-yellow-500 transition-colors"
            style={{ fontFamily: 'Cinzel, serif' }}
          >
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
