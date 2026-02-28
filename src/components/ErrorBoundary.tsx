import { Component, type ErrorInfo, type ReactNode } from "react";

type Props = { children: ReactNode };
type State = { hasError: boolean; error: Error | null };

export class ErrorBoundary extends Component<Props, State> {
    state: State = { hasError: false, error: null };

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error("ErrorBoundary caught:", error, errorInfo);
    }

    render() {
        if (this.state.hasError && this.state.error) {
            return (
                <div
                    style={{
                        minHeight: "100vh",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        padding: 24,
                        fontFamily: "system-ui, sans-serif",
                        backgroundColor: "#fef2f2",
                        color: "#991b1b",
                    }}
                >
                    <h1 style={{ fontSize: "1.25rem", marginBottom: 8 }}>
                        Something went wrong
                    </h1>
                    <pre
                        style={{
                            maxWidth: "100%",
                            overflow: "auto",
                            padding: 16,
                            backgroundColor: "#fff",
                            border: "1px solid #fecaca",
                            borderRadius: 8,
                            fontSize: 12,
                            textAlign: "left",
                        }}
                    >
                        {this.state.error.message}
                    </pre>
                    <button
                        type="button"
                        onClick={() => this.setState({ hasError: false, error: null })}
                        style={{
                            marginTop: 16,
                            padding: "8px 16px",
                            backgroundColor: "#991b1b",
                            color: "white",
                            border: "none",
                            borderRadius: 6,
                            cursor: "pointer",
                        }}
                    >
                        Try again
                    </button>
                </div>
            );
        }
        return this.props.children;
    }
}
