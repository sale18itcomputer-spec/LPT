
import React, { ErrorInfo, ReactNode } from 'react';
import { ExclamationTriangleIcon } from './Icons';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error in component:", error, errorInfo);
  }

  private handleRefresh = () => {
    window.location.reload();
  };

  render() {
    const { hasError, error } = this.state;
    const { children } = this.props;

    if (hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-full min-h-[300px] p-4 text-center bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800/50 rounded-lg">
            <ExclamationTriangleIcon className="h-12 w-12 text-red-500 mb-4" />
            <h1 className="text-xl font-bold text-red-800 dark:text-red-200">Something went wrong.</h1>
            <p className="mt-2 text-sm text-red-700 dark:text-red-300">A part of the dashboard has crashed. Please try refreshing the page.</p>
            {error && (
                <pre className="mt-4 text-xs text-left bg-red-100 dark:bg-red-900/20 p-2 rounded-md overflow-auto max-h-24 w-full">
                    {error.toString()}
                </pre>
            )}
            <button
                onClick={this.handleRefresh}
                className="mt-6 px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-md hover:bg-red-700 transition-colors"
            >
                Refresh Page
            </button>
        </div>
      );
    }

    return children;
  }
}

export default ErrorBoundary;
