import { useEffect, useRef, useState } from "react";
import { ChevronDownIcon } from "./Icons.jsx";

export default function Select({
  value,
  onChange,
  options,
  placeholder,
  disabled = false,
  error = false,
  compact = false,
  size = "md",
  title,
}) {
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(-1);
  const rootRef = useRef(null);
  const listRef = useRef(null);

  const normOptions = options.map((o) => (typeof o === "string" ? { value: o, label: o } : o));
  const opts = placeholder ? [{ value: "", label: placeholder }, ...normOptions] : normOptions;
  const selectedIndex = opts.findIndex((o) => o.value === (value ?? ""));
  const current = opts[selectedIndex];

  useEffect(() => {
    if (!open) return;
    const onDocMouseDown = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, [open]);

  useEffect(() => {
    if (!open || highlight < 0 || !listRef.current) return;
    const el = listRef.current.children[highlight];
    if (el) el.scrollIntoView({ block: "nearest" });
  }, [open, highlight]);

  const selectAt = (idx) => {
    const opt = opts[idx];
    if (!opt) return;
    onChange(opt.value);
    setOpen(false);
  };

  const openList = () => {
    setHighlight(selectedIndex >= 0 ? selectedIndex : 0);
    setOpen(true);
  };

  const toggleList = () => {
    if (open) setOpen(false);
    else openList();
  };

  const onKeyDown = (e) => {
    if (disabled) return;
    if (!open) {
      if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        openList();
      }
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => Math.min(opts.length - 1, h + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(0, h - 1));
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      selectAt(highlight);
    } else if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
    } else if (e.key === "Tab") {
      setOpen(false);
    }
  };

  const isSm = size === "sm";

  return (
    <div
      ref={rootRef}
      style={{
        ...(isSm ? cs.rootSm : cs.root),
        ...(!isSm && compact ? cs.rootCompact : null),
      }}
    >
      <button
        type="button"
        title={title}
        disabled={disabled}
        onClick={() => !disabled && toggleList()}
        onKeyDown={onKeyDown}
        style={{
          ...(isSm ? cs.triggerSm : compact ? cs.triggerCompact : cs.trigger),
          ...(error ? cs.triggerError : null),
          ...(disabled ? cs.triggerDisabled : null),
          ...(open ? cs.triggerOpen : null),
        }}
      >
        <span style={{ ...cs.triggerText, ...(!current || current.value === "" ? cs.triggerPlaceholder : null) }}>
          {current ? current.label : placeholder || ""}
        </span>
        <span style={{ ...cs.chevron, transform: open ? "rotate(180deg)" : "rotate(0deg)" }}>
          <ChevronDownIcon />
        </span>
      </button>

      {open && !disabled ? (
        <div ref={listRef} style={{ ...cs.listbox, ...(isSm ? cs.listboxSm : null) }} role="listbox" tabIndex={-1}>
          {opts.map((opt, idx) => (
            <div
              key={`${opt.value}-${idx}`}
              role="option"
              aria-selected={idx === selectedIndex}
              onMouseDown={(e) => {
                e.preventDefault();
                selectAt(idx);
              }}
              onMouseEnter={() => setHighlight(idx)}
              style={{
                ...cs.option,
                ...(idx === selectedIndex ? cs.optionSelected : null),
                ...(idx === highlight ? cs.optionHighlight : null),
              }}
            >
              <span style={cs.optionDot}>{idx === selectedIndex ? <DotIcon /> : null}</span>
              <span>{opt.label}</span>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function DotIcon() {
  return (
    <svg width="7" height="7" viewBox="0 0 24 24" fill="var(--red)">
      <circle cx="12" cy="12" r="12" />
    </svg>
  );
}

const cs = {
  root: {
    position: "relative",
    width: "100%",
  },
  rootCompact: {
    maxWidth: 220,
  },
  rootSm: {
    position: "relative",
    display: "inline-block",
  },

  trigger: {
    width: "100%",
    height: 46,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    border: "1px solid var(--border-color)",
    background: "var(--bg-surface-2)",
    color: "var(--text-main)",
    borderRadius: 14,
    padding: "0 14px",
    cursor: "pointer",
    fontWeight: 700,
    fontSize: 14,
    fontFamily: "inherit",
    boxSizing: "border-box",
    transition: "border-color 200ms cubic-bezier(0.22, 1, 0.36, 1), box-shadow 200ms cubic-bezier(0.22, 1, 0.36, 1)",
  },
  triggerCompact: {
    width: "100%",
    height: 46,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    border: "1px solid var(--border-color)",
    background: "var(--bg-surface-2)",
    color: "var(--text-main)",
    borderRadius: 14,
    padding: "0 12px",
    cursor: "pointer",
    fontWeight: 700,
    fontSize: 14,
    fontFamily: "inherit",
    boxSizing: "border-box",
    transition: "border-color 200ms cubic-bezier(0.22, 1, 0.36, 1), box-shadow 200ms cubic-bezier(0.22, 1, 0.36, 1)",
  },
  triggerSm: {
    height: 36,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 6,
    border: "1px solid var(--line)",
    background: "var(--surface-2)",
    backdropFilter: "blur(var(--glass-blur))",
    WebkitBackdropFilter: "blur(var(--glass-blur))",
    color: "var(--text-main)",
    borderRadius: 12,
    padding: "0 10px",
    cursor: "pointer",
    fontWeight: 800,
    fontSize: 13,
    fontFamily: "inherit",
    boxSizing: "border-box",
    transition: "border-color 200ms cubic-bezier(0.22, 1, 0.36, 1), box-shadow 200ms cubic-bezier(0.22, 1, 0.36, 1)",
  },
  triggerOpen: {
    borderColor: "rgba(230,57,70,0.55)",
    boxShadow:
      "0 0 0 1px rgba(230,57,70,0.45), 0 0 14px 3px rgba(230,57,70,0.35), 0 0 30px 8px rgba(230,57,70,0.18)",
  },
  triggerError: {
    border: "1px solid rgba(230,57,70,0.45)",
    boxShadow: "0 0 0 3px rgba(230,57,70,0.10)",
  },
  triggerDisabled: {
    opacity: 0.55,
    cursor: "not-allowed",
  },
  triggerText: {
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  triggerPlaceholder: {
    color: "var(--muted)",
    fontWeight: 600,
  },

  chevron: {
    flexShrink: 0,
    display: "grid",
    placeItems: "center",
    color: "var(--muted)",
    transition: "transform 220ms cubic-bezier(0.22, 1, 0.36, 1)",
  },

  listbox: {
    position: "absolute",
    top: "calc(100% + 8px)",
    left: 0,
    right: 0,
    zIndex: 40,
    maxHeight: 260,
    overflowY: "auto",
    background: "var(--panel)",
    border: "1px solid var(--border-soft)",
    borderRadius: 14,
    boxShadow: "var(--shadow)",
    padding: 6,
    display: "grid",
    gap: 2,
    animation: "selectPop 160ms cubic-bezier(0.22, 1, 0.36, 1) both",
  },
  listboxSm: {
    left: "auto",
    right: 0,
    minWidth: 170,
  },

  option: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "9px 10px",
    borderRadius: 10,
    fontSize: 14,
    fontWeight: 700,
    color: "var(--text-main)",
    cursor: "pointer",
  },
  optionSelected: {
    fontWeight: 900,
  },
  optionHighlight: {
    background: "rgba(230,57,70,0.12)",
  },
  optionDot: {
    width: 7,
    height: 7,
    display: "grid",
    placeItems: "center",
    flexShrink: 0,
  },
};
