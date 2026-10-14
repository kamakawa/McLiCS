import { createPortal } from "react-dom";

// Rendered via a portal straight into document.body: some ancestor page
// wrappers set a (visually inert) CSS transform for page-transition
// animations, which silently turns `position: fixed` into "fixed to that
// ancestor" instead of the viewport. A portal sidesteps that entirely.
export default function Modal({ open, onClose, children, width = 420 }) {
  if (!open) return null;

  return createPortal(
    <div
      style={s.backdrop}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <div style={{ ...s.panel, maxWidth: width }} onMouseDown={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>,
    document.body
  );
}

const s = {
  backdrop: {
    position: "fixed",
    inset: 0,
    zIndex: 1000,
    background: "rgba(13,16,20,0.42)",
    backdropFilter: "blur(3px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  panel: {
    width: "100%",
    background: "var(--panel)",
    border: "1px solid var(--border-soft)",
    borderRadius: 20,
    boxShadow: "var(--shadow)",
    padding: 22,
    display: "grid",
    gap: 14,
  },
};
