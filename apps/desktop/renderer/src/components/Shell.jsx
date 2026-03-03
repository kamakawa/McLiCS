import { useEffect, useState, createContext, useContext } from "react";
import { useLocation } from "react-router-dom";

const UiContext = createContext(null);

export function useUi() {
  return useContext(UiContext);
}

export default function Shell({ children }) {
  const [theme, setTheme] = useState(localStorage.getItem("theme") || "light");
  const [lang, setLang] = useState(localStorage.getItem("lang") || "en");

  const loc = useLocation();
  const hideHeader = loc.pathname === "/"; // Home = Welcome screen

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("theme", theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem("lang", lang);
  }, [lang]);

  return (
    <UiContext.Provider value={{ theme, setTheme, lang, setLang }}>
      <div style={s.shell}>
        {!hideHeader && (
          <header style={s.top}>
            <div style={s.brand}>
              <span style={s.dot} />
              <div>
                <div style={s.title}>MClist</div>
                <div style={s.sub}>Monte Carlo Simulator</div>
              </div>
            </div>

            <div style={s.actions}>
              <button
                style={s.iconBtn}
                onClick={() => setTheme((t) => (t === "light" ? "dark" : "light"))}
                title="Toggle theme"
              >
                {theme === "light" ? "☀" : "🌙"}
              </button>

              <select value={lang} onChange={(e) => setLang(e.target.value)} style={s.select} title="Language">
                <option value="en">EN</option>
                <option value="pt-BR">pt-BR</option>
                <option value="es">ES</option>
                <option value="ja">日本語</option>
                <option value="zh">中文</option>
              </select>
            </div>
          </header>
        )}

        <main style={s.main}>{children}</main>
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
  dot: { width: 14, height: 14, borderRadius: 999, background: "var(--red)" },

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

  select: {
    border: "1px solid var(--border)",
    background: "transparent",
    color: "var(--black)",
    borderRadius: 12,
    padding: "8px 10px",
    cursor: "pointer",
    fontWeight: 700,
  },

  main: { display: "grid", gap: "var(--gap)" },
};