import { useLocation, useNavigate } from "react-router-dom";

export default function Results() {
  const nav = useNavigate();
  const loc = useLocation();
  const { code, workdir, error, mode, paramPath } = loc.state || {};

  const ok = code === 0;

  return (
    <div style={{ padding: 20, display: "grid", gap: 12 }}>
      <div style={{ fontWeight: 950, fontSize: 18 }}>
        Results — {ok ? "Success" : "Failed"}
      </div>

      <div style={{ color: "var(--muted)", fontWeight: 700 }}>
        Mode: {mode} • Exit code: {code} {error ? `• ${error}` : ""}
      </div>

      <div style={{ display: "grid", gap: 6 }}>
        <div style={{ fontFamily: "ui-monospace", fontSize: 12 }}>Workdir: {workdir}</div>
        <div style={{ fontFamily: "ui-monospace", fontSize: 12 }}>Param: {paramPath}</div>
      </div>

      <div style={{ display: "flex", gap: 10 }}>
        <button
          style={btn()}
          onClick={() => nav("/setup")}
        >
          Back to Setup
        </button>

        <button
          style={btn(true)}
          onClick={() => nav("/")}
        >
          Home
        </button>
      </div>
    </div>
  );
}

function btn(secondary = false) {
  return {
    width: "fit-content",
    padding: "10px 12px",
    borderRadius: 14,
    border: "1px solid var(--border)",
    cursor: "pointer",
    fontWeight: 900,
    background: secondary ? "rgba(245,247,248,0.88)" : "transparent",
    color: "var(--black)",
  };
}