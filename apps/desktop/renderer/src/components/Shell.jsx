import { useEffect, useMemo, useState, createContext, useContext } from "react";
import { useLocation } from "react-router-dom";
import icon from "../assets/icon.png";
import iconDark from "../assets/icon-dark.png";
import { LANG_OPTIONS, normalizeLang, translate } from "../i18n.js";
import Select from "./Select.jsx";

const UiContext = createContext(null);

export function useUi() {
  return useContext(UiContext);
}

export default function Shell({ children }) {
  const [theme, setTheme] = useState(localStorage.getItem("theme") || "light");
  const [lang, setLang] = useState(() => normalizeLang(localStorage.getItem("lang") || "en"));

  const loc = useLocation();
  const hideHeader = loc.pathname === "/";

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("theme", theme);
  }, [theme]);

  useEffect(() => {
    const normalized = normalizeLang(lang);
    if (normalized !== lang) {
      setLang(normalized);
      return;
    }
    localStorage.setItem("lang", normalized);
  }, [lang]);

  const ui = useMemo(
    () => ({
      theme,
      setTheme,
      lang,
      setLang,
      languages: LANG_OPTIONS,
      t: (key, vars) => translate(lang, key, vars),
    }),
    [theme, lang]
  );

  return (
    <UiContext.Provider value={ui}>
      <div style={s.shell}>
        {!hideHeader && (
          <header style={s.top}>
            <div style={s.brand}>
              <img src={theme === "dark" ? iconDark : icon} alt="McLiCS" style={s.brandIcon} />
              <div>
                <div style={s.title}>McLiCS</div>
                <div style={s.sub}>{ui.t("appSubtitle")}</div>
              </div>
            </div>

            <div style={s.actions}>
              <button
                style={s.iconBtn}
                onClick={() => setTheme((t) => (t === "light" ? "dark" : "light"))}
                title={ui.t("toggleTheme")}
              >
                {theme === "light" ? "☀" : "🌙"}
              </button>

              <Select value={lang} onChange={setLang} options={LANG_OPTIONS} size="sm" title={ui.t("language")} />
            </div>
          </header>
        )}

        <main style={s.main}>
          <div key={loc.pathname} className="fade-slide-up" style={s.routeTransition}>
            {children}
          </div>
        </main>
      </div>
    </UiContext.Provider>
  );
}

const s = {
  shell: { minHeight: "100vh", padding: "var(--gap)" },

  top: {
    background: "var(--panel)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius)",
    boxShadow: "0 10px 26px rgba(29, 29, 29, 0.08)",
    padding: "10px 14px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "var(--gap)",
  },

  brand: { display: "flex", alignItems: "center", gap: 12 },
  brandIcon: { width: 48, height: 48, borderRadius: 12, objectFit: "cover" },

  title: { fontWeight: 900 },
  sub: { fontSize: 12, color: "var(--muted)" },

  actions: { display: "flex", alignItems: "center", gap: 10 },

  iconBtn: {
    border: "1px solid var(--border)",
    background: "transparent",
    color: "var(--black)",
    borderRadius: 12,
    padding: "8px 10px",
    cursor: "pointer",
    fontWeight: 800,
  },

  main: { display: "grid", gap: "var(--gap)" },
  routeTransition: { display: "grid", gap: "var(--gap)" },
};