import { useMemo, useState } from "react";
import { useUi } from "../components/Shell.jsx";
import {
  getAllHelpParams,
  getHelpSectionOrder,
  getHelpSections,
  getHelpUi,
  getParamHelp,
} from "../data/parameterHelp.js";

export function ParamHelp({ paramKey }) {
  const { lang } = useUi();
  const ui = getHelpUi(lang);
  const info = getParamHelp(paramKey, lang);
  const [open, setOpen] = useState(false);

  if (!info) return null;

  return (
    <span style={s.wrap}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{
          ...s.iconBtn,
          ...(open ? s.iconBtnOpen : null),
        }}
        title={open ? ui.tooltipLess : ui.tooltipMore}
      >
        ?
      </button>

      {open ? (
        <div style={s.popover}>
          <div style={s.popTitle}>{paramKey}</div>
          <div style={s.popShort}>{info.short}</div>
          <div style={s.popLong}>{info.long}</div>
          {Array.isArray(info.options) && info.options.length ? (
            <div style={s.popOptions}>
              <b>{ui.optionsLabel}:</b> {info.options.join(", ")}
            </div>
          ) : null}
        </div>
      ) : null}
    </span>
  );
}

export function ParameterHelpPanel() {
  const { lang } = useUi();
  const ui = getHelpUi(lang);
  const sections = getHelpSections(lang);
  const allParams = getAllHelpParams(lang);
  const orderedSections = getHelpSectionOrder();

  const grouped = useMemo(() => {
    const out = {};

    for (const section of orderedSections) {
      out[section] = [];
    }

    for (const [key, value] of Object.entries(allParams)) {
      const category = value.category || "grid";
      if (!out[category]) out[category] = [];
      out[category].push({ key, ...value });
    }

    return out;
  }, [allParams, orderedSections]);

  return (
    <div style={s.panel}>
      <div style={s.panelHead}>
        <div>
          <div style={s.panelTitle}>{ui.guideTitle}</div>
          <div style={s.panelSub}>{ui.guideSub}</div>
        </div>
      </div>

      <div style={s.sectionsWrap}>
        {orderedSections.map((sectionKey) => {
          const items = grouped[sectionKey] || [];
          if (!items.length) return null;

          return (
            <div key={sectionKey} style={s.sectionCard}>
              <div style={s.sectionTitle}>{sections[sectionKey] || sectionKey}</div>

              <div style={s.helpGrid}>
                {items.map((item) => (
                  <div key={item.key} style={s.helpItem}>
                    <div style={s.helpItemTop}>
                      <div style={s.helpKey}>{item.key}</div>
                      <div style={s.helpCategory}>
                        {ui.categoryLabel}: {sections[item.category] || item.category}
                      </div>
                    </div>

                    <div style={s.helpLabel}>{ui.shortLabel}</div>
                    <div style={s.helpText}>{item.short}</div>

                    <div style={{ ...s.helpLabel, marginTop: 8 }}>{ui.longLabel}</div>
                    <div style={s.helpText}>{item.long}</div>

                    {Array.isArray(item.options) && item.options.length ? (
                      <>
                        <div style={{ ...s.helpLabel, marginTop: 8 }}>{ui.optionsLabel}</div>
                        <div style={s.helpText}>{item.options.join(", ")}</div>
                      </>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const s = {
  wrap: {
    position: "relative",
    display: "inline-flex",
    alignItems: "center",
    marginLeft: 6,
  },

  iconBtn: {
    width: 18,
    height: 18,
    minWidth: 18,
    borderRadius: 999,
    border: "1px solid rgba(29,29,29,0.18)",
    background: "rgba(245,247,248,0.85)",
    color: "var(--black)",
    fontSize: 11,
    fontWeight: 950,
    lineHeight: 1,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    padding: 0,
    boxShadow: "0 6px 14px rgba(29,29,29,0.06)",
  },

  iconBtnOpen: {
    border: "1px solid rgba(230,57,70,0.25)",
    boxShadow: "0 10px 22px rgba(230,57,70,0.16)",
  },

  popover: {
    position: "absolute",
    top: "calc(100% + 8px)",
    left: 0,
    width: 300,
    zIndex: 30,
    border: "1px solid rgba(29,29,29,0.10)",
    background: "var(--panel)",
    color: "var(--black)",
    borderRadius: 14,
    padding: 12,
    boxShadow: "0 16px 38px rgba(29,29,29,0.12)",
  },

  popTitle: {
    fontWeight: 950,
    letterSpacing: "-0.02em",
    marginBottom: 6,
  },

  popShort: {
    fontSize: 12,
    fontWeight: 850,
    color: "var(--black)",
    lineHeight: 1.45,
    marginBottom: 8,
  },

  popLong: {
    fontSize: 12,
    color: "var(--muted)",
    fontWeight: 700,
    lineHeight: 1.55,
  },

  popOptions: {
    marginTop: 8,
    fontSize: 12,
    color: "var(--black)",
    fontWeight: 700,
    lineHeight: 1.45,
  },

  panel: {
    background: "var(--panel)",
    border: "1px solid var(--border)",
    borderRadius: 22,
    boxShadow: "0 16px 38px rgba(29,29,29,0.06)",
    padding: 18,
    display: "grid",
    gap: 14,
  },

  panelHead: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
    flexWrap: "wrap",
  },

  panelTitle: {
    fontWeight: 950,
    fontSize: 16,
    letterSpacing: "-0.02em",
  },

  panelSub: {
    marginTop: 4,
    fontSize: 12,
    color: "var(--muted)",
    fontWeight: 700,
    lineHeight: 1.5,
  },

  sectionsWrap: {
    display: "grid",
    gap: 14,
  },

  sectionCard: {
    border: "1px solid rgba(29,29,29,0.08)",
    borderRadius: 18,
    padding: 14,
    background: "rgba(245,247,248,0.38)",
    display: "grid",
    gap: 12,
  },

  sectionTitle: {
    fontWeight: 950,
    letterSpacing: "-0.02em",
  },

  helpGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
    gap: 12,
  },

  helpItem: {
    border: "1px solid rgba(29,29,29,0.08)",
    borderRadius: 16,
    padding: 12,
    background: "rgba(255,255,255,0.72)",
    display: "grid",
    gap: 4,
  },

  helpItemTop: {
    display: "grid",
    gap: 3,
    marginBottom: 4,
  },

  helpKey: {
    fontWeight: 950,
    color: "var(--black)",
  },

  helpCategory: {
    fontSize: 11,
    color: "var(--muted)",
    fontWeight: 800,
  },

  helpLabel: {
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: "0.04em",
    color: "var(--muted)",
    fontWeight: 900,
  },

  helpText: {
    fontSize: 12,
    color: "var(--black)",
    fontWeight: 700,
    lineHeight: 1.5,
  },
};