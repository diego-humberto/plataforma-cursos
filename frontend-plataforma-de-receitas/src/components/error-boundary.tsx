import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "./ui/button";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("ErrorBoundary caught:", error, info.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="flex flex-col items-center justify-center gap-4 py-16 px-4 text-center">
          <div className="rounded-full bg-red-100 dark:bg-red-500/15 p-4">
            <AlertTriangle className="h-10 w-10 text-red-500" />
          </div>
          <div className="space-y-1">
            <p className="text-lg font-medium text-foreground">
              Algo deu errado
            </p>
            <p className="text-sm text-muted-foreground max-w-md">
              {this.state.error?.message || "Ocorreu um erro inesperado."}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={this.handleReset}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Tentar novamente
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
