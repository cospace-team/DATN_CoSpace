import React, { Component, ReactNode } from 'react';
import { FiAlertTriangle, FiRefreshCw } from 'react-icons/fi';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="error-boundary">
          <FiAlertTriangle className="h-12 w-12 text-destructive" />
          <h2>Đã xảy ra lỗi</h2>
          <p>Trang này gặp sự cố. Vui lòng thử tải lại.</p>
          {this.state.error && (
            <code className="mt-4 text-xs text-muted-foreground bg-muted px-4 py-2 rounded-lg max-w-md overflow-auto">
              {this.state.error.message}
            </code>
          )}
          <button onClick={this.handleReset} className="btn btn-primary mt-6">
            <FiRefreshCw className="h-4 w-4" /> Thử lại
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
