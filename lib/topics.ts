// H2 Economics (SEAB 9570) topic taxonomy — 11 topics, 47 subtopics

// ─── Interfaces ──────────────────────────────────────────────────────────────

export interface TopicMatch {
  topicKey: string;
  topicLabel: string;
  category: "micro" | "macro";
  matchCount: number;
}

export interface SubtopicMatch {
  topicKey: string;
  topicLabel: string;
  subtopicKey: string;
  subtopicLabel: string;
  category: "micro" | "macro";
  matchCount: number;
}

// ─── Taxonomy ─────────────────────────────────────────────────────────────────

export const H2_ECONOMICS_TOPICS = {
  microeconomics: {
    label: "Microeconomics",
    topics: {
      demand_supply: {
        label: "Demand & Supply",
        subtopics: {
          scarcity_choice: {
            label: "Scarcity, Choice & Opportunity Cost",
            keywords: [
              "scarcity", "scarce", "choice", "opportunity cost", "trade-off",
              "economic problem", "unlimited wants", "limited resources",
              "rational economic agents", "resource allocation",
              "basic economic problem",
            ],
          },
          ppc: {
            label: "Production Possibility Curve",
            keywords: [
              "production possibility", "ppc", "ppf", "production frontier",
              "productive efficiency", "allocative inefficiency",
              "actual output", "potential output",
            ],
          },
          demand_supply_curves: {
            label: "Demand & Supply Curves",
            keywords: [
              "demand", "supply", "demand curve", "supply curve",
              "demand schedule", "supply schedule",
              "quantity demanded", "quantity supplied",
              "shift in demand", "shift in supply",
              "determinants of demand", "determinants of supply",
              "non-price factors", "complements", "substitutes",
              "normal goods", "inferior goods", "giffen goods",
              "change in demand", "change in supply", "ceteris paribus",
            ],
          },
          market_equilibrium: {
            label: "Market Equilibrium",
            keywords: [
              "equilibrium", "market equilibrium", "equilibrium price",
              "equilibrium quantity", "shortage", "surplus",
              "excess demand", "excess supply",
              "price mechanism", "market clearing", "disequilibrium",
            ],
          },
          consumer_producer_surplus: {
            label: "Consumer & Producer Surplus",
            keywords: [
              "consumer surplus", "producer surplus", "total surplus",
              "social surplus", "welfare", "deadweight loss",
              "willingness to pay", "allocative efficiency",
            ],
          },
          elasticities: {
            label: "Elasticities (PED, PES, YED, XED)",
            keywords: [
              "elasticity", "ped", "pes", "yed", "xed",
              "price elasticity", "income elasticity", "cross elasticity",
              "cross-price elasticity", "elastic", "inelastic",
              "unitary elastic", "total revenue", "responsiveness",
              "price elasticity of demand", "price elasticity of supply",
              "percentage change",
            ],
          },
        },
      },

      market_failure: {
        label: "Market Failure",
        subtopics: {
          public_goods: {
            label: "Public Goods",
            keywords: [
              "public good", "public goods", "non-excludable", "non-rivalrous",
              "non-rival", "free rider", "free-rider problem",
              "collective consumption", "market underprovision",
            ],
          },
          externalities: {
            label: "Externalities (Positive & Negative)",
            keywords: [
              "externality", "externalities", "negative externality",
              "positive externality", "external cost", "external benefit",
              "social cost", "social benefit", "private cost", "private benefit",
              "marginal social cost", "marginal social benefit",
              "marginal private cost", "marginal private benefit",
              "overproduction", "underproduction",
              "overconsumption", "underconsumption",
              "pigouvian", "pigovian", "carbon tax",
              "coe", "erp", "pollution", "congestion",
            ],
          },
          information_failure: {
            label: "Information Failure",
            keywords: [
              "information failure", "asymmetric information",
              "information asymmetry", "moral hazard", "adverse selection",
              "merit good", "demerit good",
              "under-provision", "over-provision",
              "cpf", "medishield", "hdb", "healthcare",
            ],
          },
          market_dominance: {
            label: "Market Dominance",
            keywords: [
              "market dominance", "market power", "monopoly power",
              "abuse of dominant", "consumer exploitation",
              "anti-competitive behaviour",
            ],
          },
          factor_immobility: {
            label: "Factor Immobility",
            keywords: [
              "factor immobility", "occupational immobility",
              "geographical immobility", "labour immobility",
              "capital immobility", "wage inequality",
            ],
          },
        },
      },

      firms_decisions: {
        label: "Firms & Decisions",
        subtopics: {
          profit_maximization: {
            label: "Profit Maximization (MR=MC)",
            keywords: [
              "profit maximisation", "profit maximization",
              "mr=mc", "mr = mc", "marginal revenue equals marginal cost",
              "supernormal profit", "normal profit",
              "loss minimisation", "loss minimization",
              "profit-maximizing output", "shutdown condition",
            ],
          },
          cost_revenue_analysis: {
            label: "Cost & Revenue Analysis",
            keywords: [
              "total cost", "total revenue", "average cost", "average revenue",
              "marginal cost", "marginal revenue",
              "fixed cost", "variable cost",
              "average fixed cost", "average variable cost",
              "cost curve", "revenue curve", "u-shaped cost",
            ],
          },
          economies_of_scale: {
            label: "Economies of Scale",
            keywords: [
              "economies of scale", "diseconomies of scale",
              "returns to scale", "minimum efficient scale",
              "long-run average cost", "lrac",
              "internal economies", "external economies", "natural monopoly",
            ],
          },
          pricing_strategies: {
            label: "Pricing Strategies & Price Discrimination",
            keywords: [
              "price discrimination", "first degree", "second degree",
              "third degree", "price maker", "pricing strategy",
              "predatory pricing", "limit pricing", "price leadership",
            ],
          },
          market_structures: {
            label: "Market Structures & Competition",
            keywords: [
              "perfect competition", "monopoly", "monopolistic competition",
              "oligopoly", "market structure",
              "price taker", "barriers to entry", "barriers to exit",
              "concentration ratio", "differentiated products", "homogeneous",
              "game theory", "nash equilibrium",
              "kinked demand", "collusion", "non-price competition",
            ],
          },
        },
      },

      govt_micro_intervention: {
        label: "Govt Micro Intervention",
        subtopics: {
          taxes_subsidies: {
            label: "Taxes & Subsidies",
            keywords: [
              "indirect tax", "specific tax", "ad valorem",
              "pigouvian tax", "corrective tax", "gst",
              "producer subsidy", "consumer subsidy", "subsidy",
            ],
          },
          price_controls: {
            label: "Price Controls (Max/Min Prices)",
            keywords: [
              "price ceiling", "maximum price", "price floor", "minimum price",
              "minimum wage", "rent control", "price control",
              "government intervention",
            ],
          },
          quantity_controls: {
            label: "Quantity Controls (Quotas)",
            keywords: [
              "quota", "quotas", "quantity control",
              "import quota", "production quota",
              "certificates of entitlement", "electronic road pricing",
            ],
          },
          regulation_public_provision: {
            label: "Regulation & Public Provision",
            keywords: [
              "regulation", "nationalisation", "nationalisation",
              "privatisation", "direct provision", "public provision",
              "competition policy", "anti-trust",
              "competition commission", "deregulation",
            ],
          },
        },
      },
    },
  },

  macroeconomics: {
    label: "Macroeconomics",
    topics: {
      national_income: {
        label: "National Income & Standard of Living",
        subtopics: {
          circular_flow: {
            label: "Circular Flow of Income",
            keywords: [
              "circular flow", "injections", "withdrawals", "leakages",
              "national income", "gdp", "gni", "gnp",
              "gross domestic product", "gross national income",
              "expenditure approach", "income approach", "output approach",
            ],
          },
          aggregate_demand: {
            label: "Aggregate Demand (C+I+G+X-M)",
            keywords: [
              "aggregate demand", "components of aggregate demand",
              "consumption", "investment spending", "government expenditure",
              "net exports", "c+i+g+x-m",
              "shift in ad", "determinants of ad", "ad curve",
            ],
          },
          aggregate_supply: {
            label: "Aggregate Supply",
            keywords: [
              "aggregate supply", "sras", "lras",
              "short-run aggregate supply", "long-run aggregate supply",
              "potential output", "full employment output",
              "shift in as", "as curve",
            ],
          },
          ad_as_model: {
            label: "AD-AS Model",
            keywords: [
              "ad-as", "ad as model", "macroeconomic equilibrium",
              "output gap", "inflationary gap", "deflationary gap",
              "recessionary gap", "real gdp", "price level", "keynesian",
            ],
          },
          multiplier_effect: {
            label: "Multiplier Effect",
            keywords: [
              "multiplier", "multiplier effect", "keynesian multiplier",
              "mpc", "mps",
              "marginal propensity to consume", "marginal propensity to save",
              "autonomous expenditure", "induced expenditure",
            ],
          },
        },
      },

      inflation: {
        label: "Inflation",
        subtopics: {
          demand_pull_inflation: {
            label: "Demand-Pull Inflation",
            keywords: [
              "demand-pull", "demand pull inflation",
              "demand-pull inflation", "overheating economy",
              "inflationary pressure", "inflation",
            ],
          },
          cost_push_inflation: {
            label: "Cost-Push Inflation",
            keywords: [
              "cost-push", "cost push inflation", "cost-push inflation",
              "imported inflation", "supply shock", "oil price shock",
              "wage-price spiral", "stagflation", "raw material costs",
            ],
          },
          deflation: {
            label: "Deflation",
            keywords: [
              "deflation", "deflationary", "disinflation",
              "deflationary spiral", "debt deflation",
              "cpi", "consumer price index", "inflation rate",
              "hyperinflation", "menu costs", "shoe leather costs",
            ],
          },
        },
      },

      unemployment: {
        label: "Unemployment",
        subtopics: {
          demand_deficient_unemployment: {
            label: "Demand-Deficient Unemployment",
            keywords: [
              "demand-deficient", "cyclical unemployment",
              "demand deficient unemployment", "keynesian unemployment",
              "recession unemployment", "negative output gap",
              "unemployment",
            ],
          },
          structural_unemployment: {
            label: "Structural Unemployment",
            keywords: [
              "structural unemployment", "structural change",
              "deindustrialisation", "technological unemployment",
              "automation", "retraining", "skillsfuture",
            ],
          },
          frictional_unemployment: {
            label: "Frictional Unemployment",
            keywords: [
              "frictional unemployment", "search unemployment",
              "natural rate of unemployment", "nairu",
              "job search", "full employment",
              "phillips curve", "labour market flexibility",
              "unemployment benefits",
            ],
          },
        },
      },

      economic_growth: {
        label: "Economic Growth",
        subtopics: {
          actual_vs_potential: {
            label: "Actual vs Potential Growth",
            keywords: [
              "actual growth", "potential growth", "economic growth",
              "lras shift", "productive capacity",
              "capital accumulation", "long-run growth",
            ],
          },
          sustainable_growth: {
            label: "Sustainable Growth",
            keywords: [
              "sustainable development", "sustainable growth",
              "environmental sustainability", "carbon emissions",
              "climate change", "green growth",
            ],
          },
          inclusive_growth: {
            label: "Inclusive Growth",
            keywords: [
              "inclusive growth", "income inequality",
              "gini coefficient", "gini",
              "redistribution", "equitable distribution",
              "poverty", "workfare", "progressive tax",
            ],
          },
          standard_of_living: {
            label: "Standard of Living (GDP, HDI, Gini)",
            keywords: [
              "standard of living", "hdi", "human development index",
              "real gdp per capita", "purchasing power parity", "ppp",
              "quality of life", "per capita income",
              "happiness index", "non-material wellbeing",
            ],
          },
        },
      },

      international_trade: {
        label: "International Trade",
        subtopics: {
          comparative_advantage: {
            label: "Comparative Advantage & Specialisation",
            keywords: [
              "comparative advantage", "absolute advantage",
              "specialisation", "specialization",
              "gains from trade", "terms of trade", "opportunity cost ratio",
            ],
          },
          free_trade: {
            label: "Free Trade Benefits & Costs",
            keywords: [
              "free trade", "trade liberalisation", "trade liberalization",
              "benefits of trade", "wto", "world trade organisation",
              "globalisation", "globalization", "trade war",
              "export", "import",
            ],
          },
          protectionism: {
            label: "Protectionism (Tariffs, Quotas)",
            keywords: [
              "protectionism", "tariff", "tariffs",
              "trade barrier", "embargo", "dumping",
              "infant industry argument", "strategic trade policy",
            ],
          },
          trade_agreements: {
            label: "Trade Agreements",
            keywords: [
              "free trade agreement", "fta", "trade agreement",
              "regional trade", "asean", "bilateral agreement",
              "multilateral", "trade bloc", "customs union",
            ],
          },
        },
      },

      exchange_rates_bop: {
        label: "Exchange Rates & BOP",
        subtopics: {
          exchange_rate_determination: {
            label: "Exchange Rate Determination",
            keywords: [
              "exchange rate", "appreciation", "depreciation",
              "managed float", "fixed exchange rate", "floating exchange rate",
              "mas", "neer", "s$neer",
              "monetary authority of singapore",
              "capital flows", "hot money", "currency",
            ],
          },
          marshall_lerner: {
            label: "Marshall-Lerner Condition",
            keywords: [
              "marshall-lerner", "marshall lerner condition",
              "j-curve", "j curve",
              "current account adjustment", "expenditure switching",
              "export competitiveness",
            ],
          },
          balance_of_payments: {
            label: "Balance of Payments",
            keywords: [
              "balance of payments", "bop", "current account",
              "capital account", "financial account",
              "current account deficit", "current account surplus",
              "trade balance", "foreign exchange reserves",
              "balance of trade",
            ],
          },
        },
      },

      fiscal_supply_side: {
        label: "Fiscal & Supply-Side Policies",
        subtopics: {
          discretionary_fiscal: {
            label: "Discretionary Fiscal Policy",
            keywords: [
              "fiscal policy", "government spending",
              "expansionary fiscal", "contractionary fiscal",
              "demand management", "automatic stabilizers",
              "built-in stabilizers",
            ],
          },
          government_budget: {
            label: "Government Budget (Surplus/Deficit)",
            keywords: [
              "budget deficit", "budget surplus", "balanced budget",
              "fiscal sustainability", "public debt",
              "debt-to-gdp", "government revenue",
              "budget", "fiscal prudence",
            ],
          },
          monetary_policy_interest: {
            label: "Monetary Policy (Interest Rates)",
            keywords: [
              "interest rate", "central bank",
              "quantitative easing", "money supply",
              "inflation targeting", "overnight rate",
            ],
          },
          monetary_policy_exchange: {
            label: "Monetary Policy (Exchange Rates — Singapore)",
            keywords: [
              "singapore monetary policy", "slope of the band",
              "centre of the band", "width of the band",
              "s$neer band", "neer policy", "exchange rate policy",
              "monetary policy",
            ],
          },
          supply_side_policies: {
            label: "Supply-Side Policies",
            keywords: [
              "supply-side policy", "supply side policies",
              "productivity", "human capital", "infrastructure",
              "research and development", "r&d",
              "privatisation", "innovation", "technology adoption",
            ],
          },
        },
      },
    },
  },
} as const;

// ─── Extraction functions ─────────────────────────────────────────────────────

// Local type used to safely cast subtopic values from Object.entries()
type SubtopicEntry = { label: string; keywords: readonly string[] };

/**
 * Extract matched main topics from text by aggregating keyword hits across all
 * subtopics. Returns one entry per matched main topic.
 */
export function extractTopics(text: string): TopicMatch[] {
  const lowerText = text.toLowerCase();
  const matches: TopicMatch[] = [];

  for (const [categoryKey, category] of Object.entries(H2_ECONOMICS_TOPICS)) {
    const catShort: "micro" | "macro" =
      categoryKey === "microeconomics" ? "micro" : "macro";

    for (const [topicKey, topic] of Object.entries(category.topics)) {
      let topicMatchCount = 0;

      for (const [, rawSubtopic] of Object.entries(topic.subtopics)) {
        const subtopic = rawSubtopic as SubtopicEntry;
        topicMatchCount += subtopic.keywords.filter((kw) =>
          lowerText.includes(kw)
        ).length;
      }

      if (topicMatchCount > 0) {
        matches.push({
          topicKey,
          topicLabel: topic.label,
          category: catShort,
          matchCount: topicMatchCount,
        });
      }
    }
  }

  return matches;
}

/**
 * Extract matched subtopics from text. Returns one entry per matched subtopic.
 * Used by Phase 3+ (quiz tool and subtopic tracking).
 */
export function extractSubtopics(text: string): SubtopicMatch[] {
  const lowerText = text.toLowerCase();
  const matches: SubtopicMatch[] = [];

  for (const [categoryKey, category] of Object.entries(H2_ECONOMICS_TOPICS)) {
    const catShort: "micro" | "macro" =
      categoryKey === "microeconomics" ? "micro" : "macro";

    for (const [topicKey, topic] of Object.entries(category.topics)) {
      for (const [subtopicKey, rawSubtopic] of Object.entries(topic.subtopics)) {
        const subtopic = rawSubtopic as SubtopicEntry;
        const matchCount = subtopic.keywords.filter((kw) =>
          lowerText.includes(kw)
        ).length;

        if (matchCount > 0) {
          matches.push({
            topicKey,
            topicLabel: topic.label,
            subtopicKey,
            subtopicLabel: subtopic.label,
            category: catShort,
            matchCount,
          });
        }
      }
    }
  }

  return matches;
}

// ─── Key arrays ───────────────────────────────────────────────────────────────

/** All main topic keys — used in quiz tool parameter validation */
export const TOPIC_KEYS: string[] = Object.values(H2_ECONOMICS_TOPICS).flatMap(
  (cat) => Object.keys(cat.topics)
);

/** All subtopic keys — used in Phase 3+ quiz tool validation */
export const SUBTOPIC_KEYS: string[] = Object.values(H2_ECONOMICS_TOPICS).flatMap(
  (cat) =>
    Object.values(cat.topics).flatMap((topic) => Object.keys(topic.subtopics))
);

// ─── Count helpers ────────────────────────────────────────────────────────────

/** Total number of main topics in the taxonomy */
export function getTotalTopicCount(): number {
  return Object.values(H2_ECONOMICS_TOPICS).reduce(
    (sum, cat) => sum + Object.keys(cat.topics).length,
    0
  );
}

/** Total number of subtopics across all topics */
export function getTotalSubtopicCount(): number {
  return Object.values(H2_ECONOMICS_TOPICS).reduce(
    (sum, cat) =>
      sum +
      Object.values(cat.topics).reduce(
        (tSum, topic) => tSum + Object.keys(topic.subtopics).length,
        0
      ),
    0
  );
}
