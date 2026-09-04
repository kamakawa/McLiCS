import { useMemo } from "react";
import { useUi } from "../components/Shell.jsx";
import BandChart from "../components/BandChart.jsx";

export default function Summary({ table }) {
  const { t, lang } = useUi();
  const data = useMemo(() => buildSummary(table, lang), [table, lang]);

  if (!data) {
    return <div style={s.empty}>{t("summaryNoValidData")}</div>;
  }

  return (
    <div style={s.container}>
      <div style={s.header}>
        <div style={s.title}>{t("summaryTitle")}</div>
        <div style={s.subtitle}>{t("summarySubtitle")}</div>
      </div>

      <div style={s.grid4}>
        <Metric label={t("summaryTemperatureRange")} value={`${fmt(data.tMin)} → ${fmt(data.tMax)}`} />
        <Metric label={t("summarySamples")} value={data.n} />
        <Metric label={t("summaryMeanS")} value={fmt(data.sMean)} />
        <Metric label={t("summaryMeanE")} value={fmt(data.eMean)} />
      </div>

      <div style={s.card}>
        <div style={s.cardTitle}>{t("summaryKeyInsights")}</div>
        <ul style={s.list}>
          {data.insights.map((item, idx) => (
            <li key={idx}>{item}</li>
          ))}
        </ul>
      </div>

      <div style={s.grid2}>
        <div style={s.card}>
          <div style={s.cardTitle}>{t("summaryOrderParameter")}</div>
          <p>
            {t("summaryMax")}: {fmt(data.maxS.value)} {t("summaryAtT")} {fmt(data.maxS.T)}
          </p>
          <p>
            {t("summaryMin")}: {fmt(data.minS.value)} {t("summaryAtT")} {fmt(data.minS.T)}
          </p>
        </div>

        <div style={s.card}>
          <div style={s.cardTitle}>{t("summaryEnergy")}</div>
          <p>
            {t("summaryMin")}: {fmt(data.minE.value)} {t("summaryAtT")} {fmt(data.minE.T)}
          </p>
          <p>
            {t("summaryMax")}: {fmt(data.maxE.value)} {t("summaryAtT")} {fmt(data.maxE.T)}
          </p>
        </div>
      </div>

      <div style={s.grid2}>
        <BandChart
          title={t("summaryChartS")}
          xLabel="T"
          yLabel="S"
          accent="var(--red)"
          series={data.rows.map((r) => ({
            x: r.T,
            y: r.S,
            lo: Number.isFinite(r.varS) ? r.S - Math.sqrt(Math.max(0, r.varS)) : null,
            hi: Number.isFinite(r.varS) ? r.S + Math.sqrt(Math.max(0, r.varS)) : null,
          }))}
        />
        <BandChart
          title={t("summaryChartE")}
          xLabel="T"
          yLabel="E"
          accent="var(--text-main)"
          series={data.rows.map((r) => ({
            x: r.T,
            y: r.E,
            lo: Number.isFinite(r.varE) ? r.E - Math.sqrt(Math.max(0, r.varE)) : null,
            hi: Number.isFinite(r.varE) ? r.E + Math.sqrt(Math.max(0, r.varE)) : null,
          }))}
        />
      </div>
    </div>
  );
}

/* ================= LOGIC ================= */

function buildSummary(table, lang) {
  if (!table?.rows?.length) return null;

  const rows = table.rows
    .map((r) => ({
      T: r[0],
      S: r[1],
      varS: r[2],
      E: r[3],
      varE: r[4],
    }))
    .filter((r) => [r.T, r.S, r.E].every(Number.isFinite))
    .sort((a, b) => a.T - b.T);

  if (!rows.length) return null;

  const avg = (arr) => arr.reduce((a, b) => a + b, 0) / arr.length;

  const Ts = rows.map((r) => r.T);
  const Ss = rows.map((r) => r.S);
  const Es = rows.map((r) => r.E);

  const maxS = rows.reduce((a, b) => (b.S > a.S ? b : a));
  const minS = rows.reduce((a, b) => (b.S < a.S ? b : a));
  const minE = rows.reduce((a, b) => (b.E < a.E ? b : a));
  const maxE = rows.reduce((a, b) => (b.E > a.E ? b : a));

  const insights = [];

  if (Ss[Ss.length - 1] > Ss[0]) {
    insights.push(getInsight("orderIncreases", lang));
  } else if (Ss[Ss.length - 1] < Ss[0]) {
    insights.push(getInsight("orderDecreases", lang));
  }

  if (Es[Es.length - 1] < Es[0]) {
    insights.push(getInsight("energyMoreNegative", lang));
  } else if (Es[Es.length - 1] > Es[0]) {
    insights.push(getInsight("energyIncreases", lang));
  }

  let maxDelta = 0;
  let transition = null;

  for (let i = 1; i < rows.length; i++) {
    const d = Math.abs(rows[i].S - rows[i - 1].S);
    if (d > maxDelta) {
      maxDelta = d;
      transition = (rows[i].T + rows[i - 1].T) / 2;
    }
  }

  if (transition !== null) {
    insights.push(getTransitionInsight(lang, transition));
  }

  return {
    rows,
    n: rows.length,
    tMin: Math.min(...Ts),
    tMax: Math.max(...Ts),
    sMean: avg(Ss),
    eMean: avg(Es),
    maxS: { value: maxS.S, T: maxS.T },
    minS: { value: minS.S, T: minS.T },
    minE: { value: minE.E, T: minE.T },
    maxE: { value: maxE.E, T: maxE.T },
    insights,
  };
}

function normalizeLang(lang) {
  const raw = String(lang || "en").toLowerCase();
  if (raw.startsWith("pt")) return "pt";
  if (raw.startsWith("es")) return "es";
  if (raw.startsWith("fr")) return "fr";
  if (raw.startsWith("ja")) return "ja";
  if (raw.startsWith("zh")) return "zh";
  return "en";
}

function getInsight(type, lang) {
  const l = normalizeLang(lang);

  const map = {
    orderIncreases: {
      pt: "O parâmetro de ordem aumenta à medida que a temperatura diminui.",
      en: "The order parameter increases as temperature decreases.",
      es: "El parámetro de orden aumenta a medida que la temperatura disminuye.",
      fr: "Le paramètre d’ordre augmente à mesure que la température diminue.",
      ja: "温度が低下するにつれて秩序パラメータは増加します。",
      zh: "随着温度降低，序参量增大。",
    },
    orderDecreases: {
      pt: "O parâmetro de ordem diminui à medida que a temperatura varia ao longo da faixa analisada.",
      en: "The order parameter decreases across the analyzed temperature range.",
      es: "El parámetro de orden disminuye a lo largo del rango de temperatura analizado.",
      fr: "Le paramètre d’ordre diminue sur la plage de température analysée.",
      ja: "解析した温度範囲で秩序パラメータは減少します。",
      zh: "在所分析的温度范围内，序参量减小。",
    },
    energyMoreNegative: {
      pt: "A energia fica mais negativa durante o resfriamento.",
      en: "Energy becomes more negative during cooling.",
      es: "La energía se vuelve más negativa durante el enfriamiento.",
      fr: "L’énergie devient plus négative pendant le refroidissement.",
      ja: "冷却中にエネルギーはより負の値になります。",
      zh: "在冷却过程中，能量变得更加负。",
    },
    energyIncreases: {
      pt: "A energia aumenta ao longo da faixa de temperatura analisada.",
      en: "Energy increases across the analyzed temperature range.",
      es: "La energía aumenta a lo largo del rango de temperatura analizado.",
      fr: "L’énergie augmente sur la plage de température analysée.",
      ja: "解析した温度範囲でエネルギーは増加します。",
      zh: "在所分析的温度范围内，能量增大。",
    },
  };

  return map[type]?.[l] || map[type]?.en || "";
}

function getTransitionInsight(lang, transition) {
  const l = normalizeLang(lang);
  const temp = fmt(transition);

  const map = {
    pt: `Possível transição de fase próxima de T ≈ ${temp}.`,
    en: `Possible phase transition near T ≈ ${temp}.`,
    es: `Posible transición de fase cerca de T ≈ ${temp}.`,
    fr: `Transition de phase possible près de T ≈ ${temp}.`,
    ja: `T ≈ ${temp} 付近で相転移の可能性があります。`,
    zh: `在 T ≈ ${temp} 附近可能存在相变。`,
  };

  return map[l] || map.en;
}

/* ================= UI COMPONENTS ================= */

function Metric({ label, value }) {
  return (
    <div style={s.metric}>
      <div style={s.metricLabel}>{label}</div>
      <div style={s.metricValue}>{value}</div>
    </div>
  );
}

/* ================= STYLE ================= */

const s = {
  container: { display: "grid", gap: 16 },

  header: {},
  title: { fontSize: 22, fontWeight: 900, color: "var(--text-main)" },
  subtitle: { color: "var(--muted)", fontSize: 13 },

  grid4: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: 12,
  },

  grid2: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 12,
  },

  metric: {
    padding: 12,
    border: "1px solid var(--border-soft)",
    borderRadius: 12,
    background: "var(--panel)",
    boxShadow: "var(--shadow-soft)",
  },

  metricLabel: { fontSize: 12, color: "var(--muted)" },
  metricValue: { fontSize: 18, fontWeight: 900, color: "var(--text-main)" },

  card: {
    padding: 14,
    border: "1px solid var(--border-soft)",
    borderRadius: 14,
    background: "var(--panel)",
    boxShadow: "var(--shadow-soft)",
    color: "var(--text-main)",
  },

  cardTitle: { fontWeight: 900, marginBottom: 8, color: "var(--text-main)" },

  list: {
    paddingLeft: 18,
    margin: 0,
  },

  empty: {
    padding: 20,
    textAlign: "center",
    color: "var(--muted)",
  },
};

function fmt(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return "—";
  return n.toFixed(3).replace(/0+$/g, "").replace(/\.$/g, "");
}