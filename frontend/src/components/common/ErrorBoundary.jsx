import React from 'react';
import { AlertTriangle, RefreshCw, LogOut } from 'lucide-react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[MegaTrix ErrorBoundary Catch]:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReload = () => {
    window.location.reload();
  };

  handleReset = () => {
    try {
      localStorage.removeItem('megatrix_auth_session');
    } catch (e) {}
    window.location.href = '/login';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen w-full bg-[#000000] text-white flex flex-col items-center justify-center p-6 font-mono selection:bg-rose-600 selection:text-white">
          <div className="w-full max-w-lg bg-[#0A0A0A] border border-rose-900/60 p-6 sm:p-8 space-y-6 shadow-2xl relative">
            <div className="flex items-center gap-3 border-b border-[#222222] pb-4">
              <div className="p-2 bg-rose-950/60 border border-rose-800 text-rose-400">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-sm font-bold uppercase tracking-wider text-rose-300">
                  Platform Runtime Interrupted
                </h1>
                <p className="text-xs text-zinc-400 mt-0.5">
                  An unexpected exception occurred during client rendering.
                </p>
              </div>
            </div>

            <div className="p-3 bg-[#050505] border border-[#222222] text-xs text-rose-300/90 font-mono overflow-auto max-h-40 whitespace-pre-wrap">
              {this.state.error?.toString()}
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                type="button"
                onClick={this.handleReload}
                className="flex-1 py-2.5 px-4 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Reload Platform
              </button>
              <button
                type="button"
                onClick={this.handleReset}
                className="py-2.5 px-4 bg-[#141414] hover:bg-[#1E1E1E] text-zinc-300 border border-[#333333] font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                Reset Session
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
