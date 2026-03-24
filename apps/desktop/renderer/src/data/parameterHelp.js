const BASE_PARAMS = {
  Nx: {
    category: "grid",
    options: [],
    texts: {
      en: {
        short: "Number of lattice points on x.",
        long: "Controls the system size along x. Must be a positive integer.",
      },
      "pt-BR": {
        short: "Número de pontos no eixo x.",
        long: "Controla o tamanho do sistema na direção x. Deve ser um inteiro positivo.",
      },
      es: {
        short: "Número de puntos en el eje x.",
        long: "Controla el tamaño del sistema en la dirección x. Debe ser un entero positivo.",
      },
      fr: {
        short: "Nombre de points sur l'axe x.",
        long: "Contrôle la taille du système selon x. Doit être un entier positif.",
      },
      ja: {
        short: "x方向の格子点数。",
        long: "x方向の系のサイズを制御します。正の整数である必要があります。",
      },
      zh: {
        short: "x 方向的晶格点数量。",
        long: "控制系统在 x 方向上的大小。必须为正整数。",
      },
    },
  },

  Ny: {
    category: "grid",
    options: [],
    texts: {
      en: {
        short: "Number of lattice points on y.",
        long: "Controls the system size along y. Must be a positive integer.",
      },
      "pt-BR": {
        short: "Número de pontos no eixo y.",
        long: "Controla o tamanho do sistema na direção y. Deve ser um inteiro positivo.",
      },
      es: {
        short: "Número de puntos en el eje y.",
        long: "Controla el tamaño del sistema en la dirección y. Debe ser un entero positivo.",
      },
      fr: {
        short: "Nombre de points sur l'axe y.",
        long: "Contrôle la taille du système selon y. Doit être un entier positif.",
      },
      ja: {
        short: "y方向の格子点数。",
        long: "y方向の系のサイズを制御します。正の整数である必要があります。",
      },
      zh: {
        short: "y 方向的晶格点数量。",
        long: "控制系统在 y 方向上的大小。必须为正整数。",
      },
    },
  },

  Nz: {
    category: "grid",
    options: [],
    texts: {
      en: {
        short: "Number of lattice points on z.",
        long: "Controls the system size along z. Must be a positive integer.",
      },
      "pt-BR": {
        short: "Número de pontos no eixo z.",
        long: "Controla o tamanho do sistema na direção z. Deve ser um inteiro positivo.",
      },
      es: {
        short: "Número de puntos en el eje z.",
        long: "Controla el tamaño del sistema en la dirección z. Debe ser un entero positivo.",
      },
      fr: {
        short: "Nombre de points sur l'axe z.",
        long: "Contrôle la taille du système selon z. Doit être un entier positif.",
      },
      ja: {
        short: "z方向の格子点数。",
        long: "z方向の系のサイズを制御します。正の整数である必要があります。",
      },
      zh: {
        short: "z 方向的晶格点数量。",
        long: "控制系统在 z 方向上的大小。必须为正整数。",
      },
    },
  },

  MCS: {
    category: "monteCarlo",
    options: [],
    texts: {
      en: {
        short: "Measurement Monte Carlo steps.",
        long: "Number of Monte Carlo steps used for measurement. Must be a positive integer.",
      },
      "pt-BR": {
        short: "Passos de Monte Carlo para medição.",
        long: "Número de passos de Monte Carlo usados para medir os resultados. Deve ser um inteiro positivo.",
      },
      es: {
        short: "Pasos de Monte Carlo para medición.",
        long: "Número de pasos de Monte Carlo usados para medir los resultados. Debe ser un entero positivo.",
      },
      fr: {
        short: "Pas de Monte Carlo pour la mesure.",
        long: "Nombre de pas de Monte Carlo utilisés pour mesurer les résultats. Doit être un entier positif.",
      },
      ja: {
        short: "測定用のモンテカルロステップ数。",
        long: "結果の測定に使用するモンテカルロステップ数です。正の整数である必要があります。",
      },
      zh: {
        short: "用于测量的蒙特卡洛步数。",
        long: "用于测量结果的蒙特卡洛步数。必须为正整数。",
      },
    },
  },

  MCT: {
    category: "monteCarlo",
    options: [],
    texts: {
      en: {
        short: "Thermalization Monte Carlo steps.",
        long: "Number of Monte Carlo steps used to stabilize the system before measurement. Must be a positive integer.",
      },
      "pt-BR": {
        short: "Passos de Monte Carlo para termalização.",
        long: "Número de passos de Monte Carlo usados para estabilizar o sistema antes da medição. Deve ser um inteiro positivo.",
      },
      es: {
        short: "Pasos de Monte Carlo para termalización.",
        long: "Número de pasos de Monte Carlo usados para estabilizar el sistema antes de la medición. Debe ser un entero positivo.",
      },
      fr: {
        short: "Pas de Monte Carlo pour la thermalisation.",
        long: "Nombre de pas de Monte Carlo utilisés pour stabiliser le système avant la mesure. Doit être un entier positif.",
      },
      ja: {
        short: "熱化用のモンテカルロステップ数。",
        long: "測定前に系を安定化させるためのモンテカルロステップ数です。正の整数である必要があります。",
      },
      zh: {
        short: "用于热化的蒙特卡洛步数。",
        long: "用于在测量前稳定系统的蒙特卡洛步数。必须为正整数。",
      },
    },
  },

  fn: {
    category: "monteCarlo",
    options: [],
    texts: {
      en: {
        short: "Number of output snapshots / files.",
        long: "In the backend, this controls how many outputs are written during evolution. Must be a positive integer.",
      },
      "pt-BR": {
        short: "Quantidade de saídas / arquivos.",
        long: "No backend, controla quantas saídas são gravadas durante a evolução. Deve ser um inteiro positivo.",
      },
      es: {
        short: "Cantidad de salidas / archivos.",
        long: "En el backend, controla cuántas salidas se escriben durante la evolución. Debe ser un entero positivo.",
      },
      fr: {
        short: "Nombre de sorties / fichiers.",
        long: "Dans le backend, contrôle combien de sorties sont écrites pendant l'évolution. Doit être un entier positif.",
      },
      ja: {
        short: "出力スナップショット / ファイル数。",
        long: "バックエンドで進化中に書き出される出力数を制御します。正の整数である必要があります。",
      },
      zh: {
        short: "输出快照 / 文件数量。",
        long: "在后端中，它控制演化过程中写出的输出数量。必须为正整数。",
      },
    },
  },

  nk: {
    category: "monteCarlo",
    options: ["1"],
    texts: {
      en: {
        short: "Neighbourhood kind.",
        long: "The backend accepts only 1. This parameter is fixed by the application and is not editable by the user.",
      },
      "pt-BR": {
        short: "Tipo de vizinhança.",
        long: "O backend aceita apenas 1. Este parâmetro é fixado pela aplicação e não pode ser alterado pelo usuário.",
      },
      es: {
        short: "Tipo de vecindad.",
        long: "El backend acepta solo 1. Este parámetro queda fijado por la aplicación y no puede ser editado por el usuario.",},
      fr: {
        short: "Type de voisinage.",
        long: "Le backend accepte uniquement 1. Ce paramètre est fixé par l’application et ne peut pas être modifié par l’utilisateur.",},
      ja: {
        short: "近傍タイプ。",
        long: "バックエンドは 1 のみ受け付けます。このパラメータはアプリケーション側で固定されており、ユーザーは変更できません。",},
      zh: {
        short: "邻域类型。",
        long: "后端仅接受 1。该参数由应用程序固定，用户不能修改。",
      },
    },
  },

  Ti: {
    category: "temperature",
    options: [],
    texts: {
      en: {
        short: "Initial temperature.",
        long: "First temperature of the sweep. Must be numeric.",
      },
      "pt-BR": {
        short: "Temperatura inicial.",
        long: "Primeira temperatura da varredura. Deve ser numérica.",
      },
      es: {
        short: "Temperatura inicial.",
        long: "Primera temperatura del barrido. Debe ser numérica.",
      },
      fr: {
        short: "Température initiale.",
        long: "Première température du balayage. Doit être numérique.",
      },
      ja: {
        short: "初期温度。",
        long: "温度走査の最初の温度です。数値である必要があります。",
      },
      zh: {
        short: "初始温度。",
        long: "温度扫描中的第一个温度。必须为数值。",
      },
    },
  },

  Tf: {
    category: "temperature",
    options: [],
    texts: {
      en: {
        short: "Final temperature.",
        long: "Last temperature of the sweep. Must be numeric.",
      },
      "pt-BR": {
        short: "Temperatura final.",
        long: "Última temperatura da varredura. Deve ser numérica.",
      },
      es: {
        short: "Temperatura final.",
        long: "Última temperatura del barrido. Debe ser numérica.",
      },
      fr: {
        short: "Température finale.",
        long: "Dernière température du balayage. Doit être numérique.",
      },
      ja: {
        short: "最終温度。",
        long: "温度走査の最後の温度です。数値である必要があります。",
      },
      zh: {
        short: "最终温度。",
        long: "温度扫描中的最后一个温度。必须为数值。",
      },
    },
  },

  dT: {
    category: "temperature",
    options: [],
    texts: {
      en: {
        short: "Temperature step.",
        long: "Temperature change between steps. Can be positive or negative.",
      },
      "pt-BR": {
        short: "Passo de temperatura.",
        long: "Variação de temperatura entre etapas. Pode ser positiva ou negativa.",
      },
      es: {
        short: "Paso de temperatura.",
        long: "Cambio de temperatura entre etapas. Puede ser positivo o negativo.",
      },
      fr: {
        short: "Pas de température.",
        long: "Variation de température entre les étapes. Peut être positive ou négative.",
      },
      ja: {
        short: "温度ステップ。",
        long: "各ステップ間の温度変化です。正または負の値を取れます。",
      },
      zh: {
        short: "温度步长。",
        long: "各步骤之间的温度变化。可以为正或负。",
      },
    },
  },

  potential: {
    category: "potential",
    options: ["ll", "ghrl", "pear"],
    texts: {
      en: {
        short: "System potential model.",
        long: "The backend accepts LL, GHRL and pear. LL also accepts lebwohl-lahser and GHRL also accepts grun-hess as aliases.",
      },
      "pt-BR": {
        short: "Modelo de potencial do sistema.",
        long: "O backend aceita LL, GHRL e pear. LL também aceita o alias lebwohl-lahser e GHRL também aceita grun-hess.",
      },
      es: {
        short: "Modelo de potencial del sistema.",
        long: "El backend acepta LL, GHRL y pear. LL también acepta el alias lebwohl-lahser y GHRL también acepta grun-hess.",
      },
      fr: {
        short: "Modèle de potentiel du système.",
        long: "Le backend accepte LL, GHRL et pear. LL accepte aussi l'alias lebwohl-lahser et GHRL accepte aussi grun-hess.",
      },
      ja: {
        short: "系のポテンシャルモデル。",
        long: "バックエンドは LL、GHRL、pear を受け付けます。LL は lebwohl-lahser、GHRL は grun-hess の別名も受け付けます。",
      },
      zh: {
        short: "系统势模型。",
        long: "后端接受 LL、GHRL 和 pear。LL 也接受别名 lebwohl-lahser，GHRL 也接受别名 grun-hess。",
      },
    },
  },

  p0: {
    category: "potential",
    options: [],
    texts: {
      en: {
        short: "Physical parameter related to chirality.",
        long: "Used mainly in cholesteric setups and some potentials. Must be numeric.",
      },
      "pt-BR": {
        short: "Parâmetro físico relacionado à quiralidade.",
        long: "Usado principalmente em configurações colestéricas e em alguns potenciais. Deve ser numérico.",
      },
      es: {
        short: "Parámetro físico relacionado con la quiralidad.",
        long: "Se usa principalmente en configuraciones colestéricas y en algunos potenciales. Debe ser numérico.",
      },
      fr: {
        short: "Paramètre physique lié à la chiralité.",
        long: "Utilisé principalement dans les configurations cholestériques et dans certains potentiels. Doit être numérique.",
      },
      ja: {
        short: "キラリティに関連する物理パラメータ。",
        long: "主にコレステリック設定や一部のポテンシャルで使用されます。数値である必要があります。",
      },
      zh: {
        short: "与手性相关的物理参数。",
        long: "主要用于胆甾相配置和某些势模型中。必须为数值。",
      },
    },
  },

  k11: {
    category: "potential",
    options: [],
    texts: {
      en: {
        short: "Splay elastic constant.",
        long: "Must be numeric.",
      },
      "pt-BR": {
        short: "Constante elástica de splay.",
        long: "Deve ser numérica.",
      },
      es: {
        short: "Constante elástica de splay.",
        long: "Debe ser numérica.",
      },
      fr: {
        short: "Constante élastique de splay.",
        long: "Doit être numérique.",
      },
      ja: {
        short: "スプレー弾性定数。",
        long: "数値である必要があります。",
      },
      zh: {
        short: "展曲弹性常数。",
        long: "必须为数值。",
      },
    },
  },

  k22: {
    category: "potential",
    options: [],
    texts: {
      en: {
        short: "Twist elastic constant.",
        long: "Must be numeric.",
      },
      "pt-BR": {
        short: "Constante elástica de twist.",
        long: "Deve ser numérica.",
      },
      es: {
        short: "Constante elástica de twist.",
        long: "Debe ser numérica.",
      },
      fr: {
        short: "Constante élastique de twist.",
        long: "Doit être numérique.",
      },
      ja: {
        short: "ツイスト弾性定数。",
        long: "数値である必要があります。",
      },
      zh: {
        short: "扭转弹性常数。",
        long: "必须为数值。",
      },
    },
  },

  k33: {
    category: "potential",
    options: [],
    texts: {
      en: {
        short: "Bend elastic constant.",
        long: "Must be numeric.",
      },
      "pt-BR": {
        short: "Constante elástica de bend.",
        long: "Deve ser numérica.",
      },
      es: {
        short: "Constante elástica de bend.",
        long: "Debe ser numérica.",
      },
      fr: {
        short: "Constante élastique de bend.",
        long: "Doit être numérique.",
      },
      ja: {
        short: "ベンド弾性定数。",
        long: "数値である必要があります。",
      },
      zh: {
        short: "弯曲弹性常数。",
        long: "必须为数值。",
      },
    },
  },

  ic: {
    category: "init",
    options: ["random", "homogeneous", "ic_file", "cholesteric"],
    texts: {
      en: {
        short: "Initial condition.",
        long: "The backend accepts random, homogeneous, ic_file and cholesteric.",
      },
      "pt-BR": {
        short: "Condição inicial.",
        long: "O backend aceita random, homogeneous, ic_file e cholesteric.",
      },
      es: {
        short: "Condición inicial.",
        long: "El backend acepta random, homogeneous, ic_file y cholesteric.",
      },
      fr: {
        short: "Condition initiale.",
        long: "Le backend accepte random, homogeneous, ic_file et cholesteric.",
      },
      ja: {
        short: "初期条件。",
        long: "バックエンドは random、homogeneous、ic_file、cholesteric を受け付けます。",
      },
      zh: {
        short: "初始条件。",
        long: "后端接受 random、homogeneous、ic_file 和 cholesteric。",
      },
    },
  },

  evol: {
    category: "init",
    options: ["thermal", "step", "quench", "electric"],
    texts: {
      en: {
        short: "Simulation evolution mode.",
        long: "The backend accepts thermal, step, quench and electric.",
      },
      "pt-BR": {
        short: "Modo de evolução da simulação.",
        long: "O backend aceita thermal, step, quench e electric.",
      },
      es: {
        short: "Modo de evolución de la simulación.",
        long: "El backend acepta thermal, step, quench y electric.",
      },
      fr: {
        short: "Mode d'évolution de la simulation.",
        long: "Le backend accepte thermal, step, quench et electric.",
      },
      ja: {
        short: "シミュレーションの進化モード。",
        long: "バックエンドは thermal、step、quench、electric を受け付けます。",
      },
      zh: {
        short: "模拟演化模式。",
        long: "后端接受 thermal、step、quench 和 electric。",
      },
    },
  },

  geometry: {
    category: "geometry",
    options: ["bulk", "slab", "sphere", "custom"],
    texts: {
      en: {
        short: "Domain geometry.",
        long: "The backend accepts bulk, slab, sphere and custom.",
      },
      "pt-BR": {
        short: "Geometria do domínio.",
        long: "O backend aceita bulk, slab, sphere e custom.",
      },
      es: {
        short: "Geometría del dominio.",
        long: "El backend acepta bulk, slab, sphere y custom.",
      },
      fr: {
        short: "Géométrie du domaine.",
        long: "Le backend accepte bulk, slab, sphere et custom.",
      },
      ja: {
        short: "領域の幾何形状。",
        long: "バックエンドは bulk、slab、sphere、custom を受け付けます。",
      },
      zh: {
        short: "区域几何形状。",
        long: "后端接受 bulk、slab、sphere 和 custom。",
      },
    },
  },

  boundary_file: {
    category: "geometry",
    options: [],
    texts: {
      en: {
        short: "Custom geometry file.",
        long: "Used when geometry is custom. In that case, the file should be provided.",
      },
      "pt-BR": {
        short: "Arquivo de geometria personalizada.",
        long: "Usado quando geometry é custom. Nesse caso, o arquivo deve ser informado.",
      },
      es: {
        short: "Archivo de geometría personalizada.",
        long: "Se usa cuando geometry es custom. En ese caso, debe informarse el archivo.",
      },
      fr: {
        short: "Fichier de géométrie personnalisée.",
        long: "Utilisé lorsque geometry vaut custom. Dans ce cas, le fichier doit être fourni.",
      },
      ja: {
        short: "カスタム形状ファイル。",
        long: "geometry が custom のときに使用します。その場合、このファイルを指定する必要があります。",
      },
      zh: {
        short: "自定义几何文件。",
        long: "当 geometry 为 custom 时使用。在这种情况下必须提供该文件。",
      },
    },
  },

  xbound: {
    category: "geometry",
    options: ["free", "periodic"],
    texts: {
      en: {
        short: "Boundary on x.",
        long: "The backend only accepts free and periodic.",
      },
      "pt-BR": {
        short: "Contorno no eixo x.",
        long: "O backend aceita apenas free e periodic.",
      },
      es: {
        short: "Contorno en el eje x.",
        long: "El backend solo acepta free y periodic.",
      },
      fr: {
        short: "Condition aux limites sur x.",
        long: "Le backend accepte uniquement free et periodic.",
      },
      ja: {
        short: "x軸方向の境界条件。",
        long: "バックエンドは free と periodic のみ受け付けます。",
      },
      zh: {
        short: "x 方向边界条件。",
        long: "后端只接受 free 和 periodic。",
      },
    },
  },

  ybound: {
    category: "geometry",
    options: ["free", "periodic"],
    texts: {
      en: {
        short: "Boundary on y.",
        long: "The backend only accepts free and periodic.",
      },
      "pt-BR": {
        short: "Contorno no eixo y.",
        long: "O backend aceita apenas free e periodic.",
      },
      es: {
        short: "Contorno en el eje y.",
        long: "El backend solo acepta free y periodic.",
      },
      fr: {
        short: "Condition aux limites sur y.",
        long: "Le backend accepte uniquement free et periodic.",
      },
      ja: {
        short: "y軸方向の境界条件。",
        long: "バックエンドは free と periodic のみ受け付けます。",
      },
      zh: {
        short: "y 方向边界条件。",
        long: "后端只接受 free 和 periodic。",
      },
    },
  },

  zbound: {
    category: "geometry",
    options: ["free", "periodic"],
    texts: {
      en: {
        short: "Boundary on z.",
        long: "The backend only accepts free and periodic.",
      },
      "pt-BR": {
        short: "Contorno no eixo z.",
        long: "O backend aceita apenas free e periodic.",
      },
      es: {
        short: "Contorno en el eje z.",
        long: "El backend solo acepta free y periodic.",
      },
      fr: {
        short: "Condition aux limites sur z.",
        long: "Le backend accepte uniquement free et periodic.",
      },
      ja: {
        short: "z軸方向の境界条件。",
        long: "バックエンドは free と periodic のみ受け付けます。",
      },
      zh: {
        short: "z 方向边界条件。",
        long: "后端只接受 free 和 periodic。",
      },
    },
  },

  anchoring_type: {
    category: "anchoring",
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
    texts: {
      en: {
        short: "Surface anchoring type.",
        long: "The backend accepts rp, fg, homeotropic, strong, rp_ghrl, fg_ghrl, homeotropic_ghrl and strong_ghrl.",
      },
      "pt-BR": {
        short: "Tipo de ancoragem da superfície.",
        long: "O backend aceita rp, fg, homeotropic, strong, rp_ghrl, fg_ghrl, homeotropic_ghrl e strong_ghrl.",
      },
      es: {
        short: "Tipo de anclaje de la superficie.",
        long: "El backend acepta rp, fg, homeotropic, strong, rp_ghrl, fg_ghrl, homeotropic_ghrl y strong_ghrl.",
      },
      fr: {
        short: "Type d'ancrage de la surface.",
        long: "Le backend accepte rp, fg, homeotropic, strong, rp_ghrl, fg_ghrl, homeotropic_ghrl et strong_ghrl.",
      },
      ja: {
        short: "表面アンカリングの種類。",
        long: "バックエンドは rp、fg、homeotropic、strong、rp_ghrl、fg_ghrl、homeotropic_ghrl、strong_ghrl を受け付けます。",
      },
      zh: {
        short: "表面锚定类型。",
        long: "后端接受 rp、fg、homeotropic、strong、rp_ghrl、fg_ghrl、homeotropic_ghrl 和 strong_ghrl。",
      },
    },
  },

  W: {
    category: "anchoring",
    options: [],
    texts: {
      en: {
        short: "Anchoring strength.",
        long: "Required for every anchoring entry. Must be numeric.",
      },
      "pt-BR": {
        short: "Força da ancoragem.",
        long: "Obrigatória para qualquer ancoragem cadastrada. Deve ser numérica.",
      },
      es: {
        short: "Fuerza del anclaje.",
        long: "Obligatoria para cualquier anclaje registrado. Debe ser numérica.",
      },
      fr: {
        short: "Force d'ancrage.",
        long: "Obligatoire pour toute entrée d'ancrage. Doit être numérique.",
      },
      ja: {
        short: "アンカリング強度。",
        long: "すべてのアンカリング設定で必須です。数値である必要があります。",
      },
      zh: {
        short: "锚定强度。",
        long: "每个锚定条目都必须提供。必须为数值。",
      },
    },
  },

  phi_s: {
    category: "anchoring",
    options: [],
    texts: {
      en: {
        short: "Surface azimuthal angle.",
        long: "Required for rp, strong, rp_ghrl and strong_ghrl. Must be numeric.",
      },
      "pt-BR": {
        short: "Ângulo azimutal da superfície.",
        long: "Obrigatório para rp, strong, rp_ghrl e strong_ghrl. Deve ser numérico.",
      },
      es: {
        short: "Ángulo azimutal de la superficie.",
        long: "Obligatorio para rp, strong, rp_ghrl y strong_ghrl. Debe ser numérico.",
      },
      fr: {
        short: "Angle azimutal de la surface.",
        long: "Obligatoire pour rp, strong, rp_ghrl et strong_ghrl. Doit être numérique.",
      },
      ja: {
        short: "表面の方位角。",
        long: "rp、strong、rp_ghrl、strong_ghrl では必須です。数値である必要があります。",
      },
      zh: {
        short: "表面方位角。",
        long: "对于 rp、strong、rp_ghrl 和 strong_ghrl 为必填项。必须为数值。",
      },
    },
  },

  theta_s: {
    category: "anchoring",
    options: [],
    texts: {
      en: {
        short: "Surface polar angle.",
        long: "Required for rp, strong, rp_ghrl and strong_ghrl. Must be numeric.",
      },
      "pt-BR": {
        short: "Ângulo polar da superfície.",
        long: "Obrigatório para rp, strong, rp_ghrl e strong_ghrl. Deve ser numérico.",
      },
      es: {
        short: "Ángulo polar de la superficie.",
        long: "Obligatorio para rp, strong, rp_ghrl y strong_ghrl. Debe ser numérico.",
      },
      fr: {
        short: "Angle polaire de la surface.",
        long: "Obligatoire pour rp, strong, rp_ghrl et strong_ghrl. Doit être numérique.",
      },
      ja: {
        short: "表面の極角。",
        long: "rp、strong、rp_ghrl、strong_ghrl では必須です。数値である必要があります。",
      },
      zh: {
        short: "表面极角。",
        long: "对于 rp、strong、rp_ghrl 和 strong_ghrl 为必填项。必须为数值。",
      },
    },
  },
};

const LOCALES = {
  "pt-BR": {
    ui: {
      guideButtonShow: "Guia dos parâmetros",
      guideButtonHide: "Ocultar guia",
      guideTitle: "Guia dos parâmetros",
      guideSub: "Explicações rápidas e opções válidas dos campos configuráveis do backend.",
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
  },

  es: {
    ui: {
      guideButtonShow: "Guía de parámetros",
      guideButtonHide: "Ocultar guía",
      guideTitle: "Guía de parámetros",
      guideSub: "Explicaciones rápidas y opciones válidas para los campos configurables del backend.",
      shortLabel: "Resumen",
      longLabel: "Explicación",
      categoryLabel: "Categoría",
      optionsLabel: "Opciones",
      tooltipMore: "Haz clic para ver más",
      tooltipLess: "Haz clic para contraer",
    },
    sections: {
      grid: "Malla",
      monteCarlo: "Monte Carlo",
      temperature: "Temperatura",
      potential: "Potencial / física",
      init: "Inicialización y evolución",
      geometry: "Geometría y contornos",
      anchoring: "Anclaje",
    },
  },

  fr: {
    ui: {
      guideButtonShow: "Guide des paramètres",
      guideButtonHide: "Masquer le guide",
      guideTitle: "Guide des paramètres",
      guideSub: "Explications rapides et options valides pour les champs configurables du backend.",
      shortLabel: "Résumé",
      longLabel: "Explication",
      categoryLabel: "Catégorie",
      optionsLabel: "Options",
      tooltipMore: "Cliquez pour voir plus",
      tooltipLess: "Cliquez pour réduire",
    },
    sections: {
      grid: "Maille",
      monteCarlo: "Monte Carlo",
      temperature: "Température",
      potential: "Potentiel / physique",
      init: "Initialisation et évolution",
      geometry: "Géométrie et frontières",
      anchoring: "Ancrage",
    },
  },

  ja: {
    ui: {
      guideButtonShow: "パラメータガイド",
      guideButtonHide: "ガイドを隠す",
      guideTitle: "パラメータガイド",
      guideSub: "バックエンドで設定可能な項目の簡単な説明と有効な選択肢です。",
      shortLabel: "概要",
      longLabel: "説明",
      categoryLabel: "カテゴリ",
      optionsLabel: "選択肢",
      tooltipMore: "クリックして詳細を見る",
      tooltipLess: "クリックして閉じる",
    },
    sections: {
      grid: "格子",
      monteCarlo: "モンテカルロ",
      temperature: "温度",
      potential: "ポテンシャル / 物理",
      init: "初期化と進化",
      geometry: "形状と境界条件",
      anchoring: "アンカリング",
    },
  },

  zh: {
    ui: {
      guideButtonShow: "参数指南",
      guideButtonHide: "隐藏指南",
      guideTitle: "参数指南",
      guideSub: "后端可配置字段的快速说明和有效选项。",
      shortLabel: "摘要",
      longLabel: "说明",
      categoryLabel: "类别",
      optionsLabel: "选项",
      tooltipMore: "点击查看更多",
      tooltipLess: "点击收起",
    },
    sections: {
      grid: "网格",
      monteCarlo: "蒙特卡洛",
      temperature: "温度",
      potential: "势 / 物理",
      init: "初始化与演化",
      geometry: "几何与边界",
      anchoring: "锚定",
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
  if (raw.startsWith("en")) return "en";
  if (raw.startsWith("es")) return "es";
  if (raw.startsWith("fr")) return "fr";
  if (raw.startsWith("ja")) return "ja";
  if (raw.startsWith("zh")) return "zh";

  return "en";
}

function buildParamsForLocale(lang) {
  const locale = normalizeHelpLang(lang);

  return Object.fromEntries(
    Object.entries(BASE_PARAMS).map(([key, value]) => {
      const localized =
        value.texts[locale] ||
        value.texts.en ||
        value.texts["pt-BR"];

      return [
        key,
        {
          category: value.category,
          short: localized.short,
          long: localized.long,
          options: Array.isArray(value.options) ? value.options : [],
        },
      ];
    })
  );
}

export function getHelpLocale(lang) {
  const key = normalizeHelpLang(lang);
  const localeData = LOCALES[key] || LOCALES.en;

  return {
    ...localeData,
    params: buildParamsForLocale(key),
  };
}

export function getParamHelp(paramKey, lang) {
  const locale = getHelpLocale(lang);
  return locale.params?.[paramKey] || getHelpLocale("en").params?.[paramKey] || null;
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