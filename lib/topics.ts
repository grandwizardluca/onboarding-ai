// H2 Economics (SEAB 9570) topic taxonomy for keyword-based extraction

export interface TopicMatch {
  topicKey: string;
  topicLabel: string;
  category: "micro" | "macro";
  matchCount: number;
}

export const H2_ECONOMICS_TOPICS = {
  micro: {
    label: "Microeconomics",
    topics: {
      "demand-supply": {
        label: "Demand & Supply",
        keywords: [
          "demand", "supply", "equilibrium", "shortage", "surplus",
          "price mechanism", "market equilibrium", "shift in demand",
          "shift in supply", "quantity demanded", "quantity supplied",
          "demand curve", "supply curve", "ceteris paribus",
        ],
      },
      elasticity: {
        label: "Elasticity",
        keywords: [
          "elasticity", "ped", "pes", "yed", "xed",
          "price elasticity", "income elasticity", "cross elasticity",
          "elastic", "inelastic", "unitary", "total revenue",
          "percentage change",
        ],
      },
      "market-failure": {
        label: "Market Failure",
        keywords: [
          "market failure", "externality", "externalities",
          "public good", "merit good", "demerit good",
          "information failure", "asymmetric information",
          "free rider", "non-excludable", "non-rivalrous",
          "social cost", "social benefit", "private cost",
          "deadweight loss", "allocative efficiency",
          "coe", "erp", "cpf", "hdb", "pigouvian",
          "subsidy", "tax", "regulation", "ban",
        ],
      },
      "firms-decisions": {
        label: "Firms & Decisions",
        keywords: [
          "perfect competition", "monopoly", "monopolistic competition",
          "oligopoly", "market structure", "profit maximisation",
          "revenue", "marginal cost", "marginal revenue",
          "average cost", "economies of scale", "diseconomies",
          "barriers to entry", "supernormal profit", "normal profit",
          "price taker", "price maker", "concentration ratio",
          "collusion", "game theory", "price discrimination",
        ],
      },
      "government-micro": {
        label: "Govt Micro Intervention",
        keywords: [
          "price ceiling", "price floor", "minimum wage",
          "quota", "tariff", "direct provision",
          "government intervention",
          "nationalisation", "privatisation",
          "competition policy", "anti-trust",
        ],
      },
    },
  },
  macro: {
    label: "Macroeconomics",
    topics: {
      "national-income": {
        label: "National Income & SOL",
        keywords: [
          "gdp", "gni", "national income", "standard of living",
          "real gdp", "nominal gdp", "per capita",
          "purchasing power parity", "ppp", "hdi",
          "circular flow", "injections", "withdrawals",
          "multiplier", "aggregate demand", "aggregate supply",
          "keynesian",
        ],
      },
      inflation: {
        label: "Inflation",
        keywords: [
          "inflation", "deflation", "disinflation",
          "cpi", "consumer price index", "cost-push",
          "demand-pull", "imported inflation",
          "hyperinflation", "stagflation",
          "menu costs", "shoe leather",
        ],
      },
      unemployment: {
        label: "Unemployment",
        keywords: [
          "unemployment", "cyclical", "structural",
          "frictional", "natural rate", "nairu",
          "labour market", "wage", "phillips curve",
          "retraining", "skillsfuture",
        ],
      },
      "economic-growth": {
        label: "Economic Growth",
        keywords: [
          "economic growth", "actual growth", "potential growth",
          "lras", "sras", "productivity", "technology",
          "capital accumulation", "innovation",
          "supply-side policy", "infrastructure",
          "sustainable development", "inclusive growth",
        ],
      },
      trade: {
        label: "International Trade",
        keywords: [
          "trade", "export", "import", "comparative advantage",
          "absolute advantage", "free trade", "protectionism",
          "tariff", "quota", "embargo", "wto",
          "terms of trade", "balance of trade",
          "balance of payments", "current account",
          "capital account", "financial account",
          "globalisation", "trade war",
        ],
      },
      "exchange-rate": {
        label: "Exchange Rates & BOP",
        keywords: [
          "exchange rate", "appreciation", "depreciation",
          "mas", "neer", "monetary policy",
          "managed float", "fixed exchange rate",
          "floating exchange rate", "capital flows",
          "hot money", "marshall-lerner",
          "j-curve",
        ],
      },
      "fiscal-policy": {
        label: "Fiscal & Supply-Side Policies",
        keywords: [
          "fiscal policy", "government spending", "taxation",
          "budget", "budget deficit", "budget surplus",
          "expansionary", "contractionary",
          "supply-side", "deregulation",
          "workfare",
        ],
      },
    },
  },
} as const;

/**
 * Extract H2 Economics topics from message text using keyword matching.
 * Returns topics that have at least one keyword match.
 */
export function extractTopics(text: string): TopicMatch[] {
  const lowerText = text.toLowerCase();
  const matches: TopicMatch[] = [];

  for (const [categoryKey, category] of Object.entries(H2_ECONOMICS_TOPICS)) {
    for (const [topicKey, topic] of Object.entries(category.topics)) {
      const matchCount = topic.keywords.filter((kw: string) =>
        lowerText.includes(kw)
      ).length;
      if (matchCount > 0) {
        matches.push({
          topicKey,
          topicLabel: topic.label,
          category: categoryKey as "micro" | "macro",
          matchCount,
        });
      }
    }
  }

  return matches;
}

/** All topic keys across the taxonomy, for use in tool parameter validation */
export const TOPIC_KEYS: string[] = Object.values(H2_ECONOMICS_TOPICS).flatMap(
  (cat) => Object.keys(cat.topics)
);

/** Get the total number of topics in the taxonomy */
export function getTotalTopicCount(): number {
  let count = 0;
  for (const category of Object.values(H2_ECONOMICS_TOPICS)) {
    count += Object.keys(category.topics).length;
  }
  return count;
}
