import { Component } from "react";

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error("[ErrorBoundary]", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: "100vh", background: "#050505", color: "#e0e0e0",
          fontFamily: "monospace", display: "flex", alignItems: "center",
          justifyContent: "center", textAlign: "center", padding: 32,
        }}>
          <div>
            <div style={{ fontSize: 40, color: "#ef4444", marginBottom: 16 }}>⚠</div>
            <div style={{ color: "#ef4444", fontSize: 16, marginBottom: 8 }}>Something went wrong</div>
            <div style={{ color: "#444", fontSize: 12, marginBottom: 24, maxWidth: 420, lineHeight: 1.6 }}>
              {this.state.error?.message || "An unexpected error occurred in the application."}
            </div>
            <button
              onClick={() => { this.setState({ hasError: false, error: null }); window.location.reload(); }}
              style={{ background: "#dc2626", color: "#fff", border: "none", borderRadius: 6, padding: "9px 22px", cursor: "pointer", fontSize: 12, fontFamily: "inherit" }}
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
