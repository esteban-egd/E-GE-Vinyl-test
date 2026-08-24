import React from 'react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[ErrorBoundary caught error]:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen w-full flex flex-col items-center justify-center bg-black text-white p-6 text-center">
          <div className="w-16 h-16 rounded-full bg-red-500/20 border border-red-500/30 flex items-center justify-center mb-4">
            <span className="text-2xl">⚠️</span>
          </div>
          <h2 className="text-xl font-semibold mb-2">Une erreur est survenue</h2>
          <p className="text-zinc-400 text-sm max-w-md mb-6">
            {this.state.error?.message || "L'application a rencontré un problème inattendu."}
          </p>
          <button
            onClick={() => {
              this.setState({ hasError: false, error: null });
              window.location.reload();
            }}
            className="px-6 py-2.5 rounded-full bg-white text-black font-medium text-sm hover:bg-zinc-200 transition-colors"
          >
            Recharger l'application
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
