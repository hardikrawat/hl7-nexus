import React from 'react';

/**
 * M-04: React Error Boundary
 * Prevents the entire app from crashing to a white screen when a component throws.
 * Shows a graceful fallback UI instead.
 */
export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[HELIX ERROR BOUNDARY]', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center h-full bg-slate-900 p-8">
          <div className="border-2 border-red-600 bg-red-950 p-8 max-w-lg text-center">
            <div className="font-mono text-[11px] text-red-400 uppercase tracking-widest mb-4">
              System fault detected
            </div>
            <h2 className="font-mono text-lg font-bold text-white mb-4">
              HELIX COMPONENT FAILURE
            </h2>
            <p className="font-mono text-[11px] text-red-300 mb-6">
              {this.state.error?.message || 'An unexpected error occurred in the rendering pipeline.'}
            </p>
            <button
              onClick={() => this.setState({ hasError: false, error: null })}
              className="border-2 border-red-600 bg-red-700 text-white px-6 py-2 font-mono text-[11px] uppercase tracking-widest font-bold hover:bg-red-600 transition-colors"
            >
              [ATTEMPT RECOVERY]
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
