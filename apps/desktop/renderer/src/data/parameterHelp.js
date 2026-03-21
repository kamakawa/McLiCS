const HELP_TEXT = {
  "pt-BR": {
    ui: {
      guideButtonShow: "Guia dos parâmetros",
      guideButtonHide: "Ocultar guia",
      guideTitle: "Guia dos parâmetros",
      guideSub:
        "Explicações rápidas e opções válidas dos campos configuráveis do backend.",
      shortLabel: "Resumo",
      longLabel: "Explicação",
      categoryLabel: "Categoria",
      optionsLabel: "Opções",
      tooltipMore: "Clique para ver mais",
      tooltipLess: "Clique para recolher",
    },
    sections: {
      grid: "Grade",
      monteCarlo: "Monte Carlo",
      temperature: "Temperatura",
      potential: "Potencial / física",
      init: "Inicialização e evolução",
      geometry: "Geometria e contornos",
      anchoring: "Ancoragem",
    },
    params: {
      Nx: {
        category: "grid",
        short: "Número de pontos no eixo x.",
        long: "Controla o tamanho da rede na direção x. Deve ser inteiro positivo.",
        options: [],
      },
      Ny: {
        category: "grid",
        short: "Número de pontos no eixo y.",
        long: "Controla o tamanho da rede na direção y. Deve ser inteiro positivo.",
        options: [],
      },
      Nz: {
        category: "grid",
        short: "Número de pontos no eixo z.",
        long: "Controla o tamanho da rede na direção z. Deve ser inteiro positivo.",
        options: [],
      },
      MCS: {
        category: "monteCarlo",
        short: "Passos usados para medição.",
        long: "Número de passos de Monte Carlo usados para coletar os resultados. Deve ser inteiro positivo.",
        options: [],
      },
      MCT: {
        category: "monteCarlo",
        short: "Passos usados para termalização.",
        long: "Número de passos de Monte Carlo usados para estabilizar o sistema antes da medição. Deve ser inteiro positivo.",
        options: [],
      },
      fn: {
        category: "monteCarlo",
        short: "Quantidade de arquivos / pontos de saída.",
        long: "No backend, este valor controla quantos resultados são gravados ao longo da evolução. Deve ser inteiro positivo.",
        options: [],
      },
      nk: {
        category: "monteCarlo",
        short: "Tipo de vizinhança.",
        long: "O backend aceita 1, 2 ou 3, correspondendo ao número de camadas de vizinhos consideradas no cálculo.",
        options: ["1", "2", "3"],
      },
      Ti: {
        category: "temperature",
        short: "Temperatura inicial.",
        long: "Primeira temperatura da varredura térmica. Deve ser numérica.",
        options: [],
      },
      Tf: {
        category: "temperature",
        short: "Temperatura final.",
        long: "Última temperatura da varredura térmica. Deve ser numérica.",
        options: [],
      },
      dT: {
        category: "temperature",
        short: "Passo de temperatura.",
        long: "Variação de temperatura entre uma etapa e outra. Pode ser positiva ou negativa.",
        options: [],
      },
      potential: {
        category: "potential",
        short: "Modelo de potencial do sistema.",
        long: "O backend aceita LL, GHRL e pear. LL também aceita o alias lebwohl-lahser e GHRL também aceita grun-hess.",
        options: ["ll", "ghrl", "pear"],
      },
      p0: {
        category: "potential",
        short: "Parâmetro físico associado à quiralidade.",
        long: "Usado principalmente em configurações colestéricas e em alguns potenciais. Deve ser numérico.",
        options: [],
      },
      k11: {
        category: "potential",
        short: "Constante elástica de splay.",
        long: "Deve ser numérica.",
        options: [],
      },
      k22: {
        category: "potential",
        short: "Constante elástica de twist.",
        long: "Deve ser numérica.",
        options: [],
      },
      k33: {
        category: "potential",
        short: "Constante elástica de bend.",
        long: "Deve ser numérica.",
        options: [],
      },
      ic: {
        category: "init",
        short: "Condição inicial.",
        long: "O backend aceita random, homogeneous, ic_file e cholesteric.",
        options: ["random", "homogeneous", "ic_file", "cholesteric"],
      },
      evol: {
        category: "init",
        short: "Modo de evolução da simulação.",
        long: "O backend aceita thermal, step, quench e electric.",
        options: ["thermal", "step", "quench", "electric"],
      },
      geometry: {
        category: "geometry",
        short: "Geometria do domínio.",
        long: "O backend aceita bulk, slab, sphere e custom.",
        options: ["bulk", "slab", "sphere", "custom"],
      },
      boundary_file: {
        category: "geometry",
        short: "Arquivo de geometria personalizada.",
        long: "Usado quando a geometria é custom. Nesse caso, o arquivo deve ser informado.",
        options: [],
      },
      xbound: {
        category: "geometry",
        short: "Contorno no eixo x.",
        long: "O backend aceita apenas free e periodic.",
        options: ["free", "periodic"],
      },
      ybound: {
        category: "geometry",
        short: "Contorno no eixo y.",
        long: "O backend aceita apenas free e periodic.",
        options: ["free", "periodic"],
      },
      zbound: {
        category: "geometry",
        short: "Contorno no eixo z.",
        long: "O backend aceita apenas free e periodic.",
        options: ["free", "periodic"],
      },
      anchoring_type: {
        category: "anchoring",
        short: "Tipo de ancoragem da superfície.",
        long: "O backend aceita rp, fg, homeotropic, strong, rp_ghrl, fg_ghrl, homeotropic_ghrl e strong_ghrl.",
        options: [
          "rp",
          "fg",
          "homeotropic",
          "strong",
          "rp_ghrl",
          "fg_ghrl",
          "homeotropic_ghrl",
          "strong_ghrl",
        ],
      },
      W: {
        category: "anchoring",
        short: "Força da ancoragem.",
        long: "Obrigatória para qualquer ancoragem cadastrada. Deve ser numérica.",
        options: [],
      },
      phi_s: {
        category: "anchoring",
        short: "Ângulo azimutal da superfície.",
        long: "Obrigatório para rp, strong, rp_ghrl e strong_ghrl. Deve ser numérico.",
        options: [],
      },
      theta_s: {
        category: "anchoring",
        short: "Ângulo polar da superfície.",
        long: "Obrigatório para rp, strong, rp_ghrl e strong_ghrl. Deve ser numérico.",
        options: [],
      },
    },
  },

  en: {
    ui: {
      guideButtonShow: "Parameter Guide",
      guideButtonHide: "Hide Guide",
      guideTitle: "Parameter Guide",
      guideSub: "Quick explanations and valid backend options for configurable fields.",
      shortLabel: "Summary",
      longLabel: "Explanation",
      categoryLabel: "Category",
      optionsLabel: "Options",
      tooltipMore: "Click to see more",
      tooltipLess: "Click to collapse",
    },
    sections: {
      grid: "Grid",
      monteCarlo: "Monte Carlo",
      temperature: "Temperature",
      potential: "Potential / physics",
      init: "Initialization & evolution",
      geometry: "Geometry & boundaries",
      anchoring: "Anchoring",
    },
    params: {
      Nx: {
        category: "grid",
        short: "Number of lattice points on x.",
        long: "Controls system size along x. Must be a positive integer.",
        options: [],
      },
      Ny: {
        category: "grid",
        short: "Number of lattice points on y.",
        long: "Controls system size along y. Must be a positive integer.",
        options: [],
      },
      Nz: {
        category: "grid",
        short: "Number of lattice points on z.",
        long: "Controls system size along z. Must be a positive integer.",
        options: [],
      },
      MCS: {
        category: "monteCarlo",
        short: "Measurement Monte Carlo steps.",
        long: "Number of Monte Carlo steps used for measurement. Must be a positive integer.",
        options: [],
      },
      MCT: {
        category: "monteCarlo",
        short: "Thermalization Monte Carlo steps.",
        long: "Number of Monte Carlo steps used to stabilize the system before measurement. Must be a positive integer.",
        options: [],
      },
      fn: {
        category: "monteCarlo",
        short: "Number of output snapshots / files.",
        long: "In the backend, this controls how many outputs are written during evolution. Must be a positive integer.",
        options: [],
      },
      nk: {
        category: "monteCarlo",
        short: "Neighbourhood kind.",
        long: "The backend accepts 1, 2 or 3, meaning how many neighbour shells are used in the calculation.",
        options: ["1", "2", "3"],
      },
      Ti: {
        category: "temperature",
        short: "Initial temperature.",
        long: "First temperature of the sweep. Must be numeric.",
        options: [],
      },
      Tf: {
        category: "temperature",
        short: "Final temperature.",
        long: "Last temperature of the sweep. Must be numeric.",
        options: [],
      },
      dT: {
        category: "temperature",
        short: "Temperature step.",
        long: "Temperature change between steps. Can be positive or negative.",
        options: [],
      },
      potential: {
        category: "potential",
        short: "System potential model.",
        long: "The backend accepts LL, GHRL and pear. LL also accepts lebwohl-lahser and GHRL also accepts grun-hess as aliases.",
        options: ["ll", "ghrl", "pear"],
      },
      p0: {
        category: "potential",
        short: "Physical parameter related to chirality.",
        long: "Used mainly in cholesteric setups and some potentials. Must be numeric.",
        options: [],
      },
      k11: {
        category: "potential",
        short: "Splay elastic constant.",
        long: "Must be numeric.",
        options: [],
      },
      k22: {
        category: "potential",
        short: "Twist elastic constant.",
        long: "Must be numeric.",
        options: [],
      },
      k33: {
        category: "potential",
        short: "Bend elastic constant.",
        long: "Must be numeric.",
        options: [],
      },
      ic: {
        category: "init",
        short: "Initial condition.",
        long: "The backend accepts random, homogeneous, ic_file and cholesteric.",
        options: ["random", "homogeneous", "ic_file", "cholesteric"],
      },
      evol: {
        category: "init",
        short: "Simulation evolution mode.",
        long: "The backend accepts thermal, step, quench and electric.",
        options: ["thermal", "step", "quench", "electric"],
      },
      geometry: {
        category: "geometry",
        short: "Domain geometry.",
        long: "The backend accepts bulk, slab, sphere and custom.",
        options: ["bulk", "slab", "sphere", "custom"],
      },
      boundary_file: {
        category: "geometry",
        short: "Custom geometry file.",
        long: "Used when geometry is custom. In that case, the file should be provided.",
        options: [],
      },
      xbound: {
        category: "geometry",
        short: "Boundary on x.",
        long: "The backend only accepts free and periodic.",
        options: ["free", "periodic"],
      },
      ybound: {
        category: "geometry",
        short: "Boundary on y.",
        long: "The backend only accepts free and periodic.",
        options: ["free", "periodic"],
      },
      zbound: {
        category: "geometry",
        short: "Boundary on z.",
        long: "The backend only accepts free and periodic.",
        options: ["free", "periodic"],
      },
      anchoring_type: {
        category: "anchoring",
        short: "Surface anchoring type.",
        long: "The backend accepts rp, fg, homeotropic, strong, rp_ghrl, fg_ghrl, homeotropic_ghrl and strong_ghrl.",
        options: [
          "rp",
          "fg",
          "homeotropic",
          "strong",
          "rp_ghrl",
          "fg_ghrl",
          "homeotropic_ghrl",
          "strong_ghrl",
        ],
      },
      W: {
        category: "anchoring",
        short: "Anchoring strength.",
        long: "Required for every anchoring entry. Must be numeric.",
        options: [],
      },
      phi_s: {
        category: "anchoring",
        short: "Surface azimuthal angle.",
        long: "Required for rp, strong, rp_ghrl and strong_ghrl. Must be numeric.",
        options: [],
      },
      theta_s: {
        category: "anchoring",
        short: "Surface polar angle.",
        long: "Required for rp, strong, rp_ghrl and strong_ghrl. Must be numeric.",
        options: [],
      },
    },
  },
};

const SECTION_ORDER = [
  "grid",
  "monteCarlo",
  "temperature",
  "potential",
  "init",
  "geometry",
  "anchoring",
];

function normalizeHelpLang(lang) {
  const raw = String(lang || "en").toLowerCase();
  if (raw.startsWith("pt")) return "pt-BR";
  return "en";
}

export function getHelpLocale(lang) {
  const key = normalizeHelpLang(lang);
  return HELP_TEXT[key] || HELP_TEXT.en;
}

export function getParamHelp(paramKey, lang) {
  const locale = getHelpLocale(lang);
  return locale.params?.[paramKey] || HELP_TEXT.en.params?.[paramKey] || null;
}

export function getHelpUi(lang) {
  return getHelpLocale(lang).ui;
}

export function getHelpSections(lang) {
  return getHelpLocale(lang).sections;
}

export function getHelpSectionOrder() {
  return SECTION_ORDER.slice();
}

export function getAllHelpParams(lang) {
  return getHelpLocale(lang).params;
}