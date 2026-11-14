import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { FarmFieldPlot, NasaFarmResponse } from '../src/types/farm.ts';

interface KnowledgeSection {
  id: string;
  title: string;
  body: string;
  keywords: string[];
  sourceFile: string;
}

export interface AugmentPromptOptions {
  farmData?: NasaFarmResponse;
  activeField?: FarmFieldPlot;
  userQuery: string;
}

export interface AugmentedPromptResult {
  augmentedPrompt: string;
  matchedModules: string[];
}

const SECTION_KEYWORD_MAP: Array<{ matchTitle: RegExp; keywords: string[] }> = [
  {
    matchTitle: /Shared Disease & Rotation/i,
    keywords: ['tomato', 'pepper', 'potato', 'nightshade', 'blight', 'wilt', 'nematode', 'rotation'],
  },
  {
    matchTitle: /^Tomatoes$/i,
    keywords: ['tomato', 'tomatoes', 'blossom', 'lycopene', 'stake', 'prun'],
  },
  {
    matchTitle: /^Peppers/i,
    keywords: ['pepper', 'peppers', 'chili', 'bell', 'sunscald'],
  },
  {
    matchTitle: /^Potatoes$/i,
    keywords: ['potato', 'potatoes', 'tuber', 'scab', 'hill'],
  },
  {
    matchTitle: /Winter \/ Spring Wheat/i,
    keywords: ['wheat', 'grain', 'cereal', 'straw', 'lodging', 'anthesis', 'rotation'],
  },
  {
    matchTitle: /^Corn/i,
    keywords: ['corn', 'maize', 'tassel', 'silk', 'windbreak'],
  },
  {
    matchTitle: /^Sunflower$/i,
    keywords: ['sunflower', 'taproot', 'hardpan', 'compact', 'sclerotinia'],
  },
  {
    matchTitle: /^Chickpeas/i,
    keywords: ['chickpea', 'chickpeas', 'garbanzo', 'legume', 'nitrogen', 'nodule'],
  },
  {
    matchTitle: /^Crimson Clover/i,
    keywords: ['clover', 'cover crop', 'nitrogen', 'humus', 'bloom'],
  },
  {
    matchTitle: /^White Mustard/i,
    keywords: ['mustard', 'brassica', 'biofumig', 'nematode', 'cover crop'],
  },
  {
    matchTitle: /^Melons/i,
    keywords: ['melon', 'melons', 'watermelon', 'cantaloupe', 'brix', 'bee', 'pollinat'],
  },
  {
    matchTitle: /^Onions/i,
    keywords: ['onion', 'onions', 'allium', 'bulb', 'shallow'],
  },
  {
    matchTitle: /^Managed Fallow/i,
    keywords: ['fallow', 'rest', 'bare', 'dust', 'mycorrhiz'],
  },
  {
    matchTitle: /^Soil pH & Texture/i,
    keywords: ['soil', 'ph', 'alkaline', 'acid', 'clay', 'sand', 'loam', 'compost', 'sulfur', 'lime'],
  },
  {
    matchTitle: /^Interpreting NASA Satellite/i,
    keywords: ['nasa', 'smap', 'hls', 'ndvi', 'gpm', 'imerg', 'satellite', 'rain', 'moisture', 'ground', 'squeeze'],
  },
  {
    matchTitle: /^Water-Saving Field Practices/i,
    keywords: ['water', 'irrigat', 'drip', 'mulch', 'evaporat', 'heat', 'drought', 'hot'],
  },
];

let cachedSections: KnowledgeSection[] | null = null;

function resolveKnowledgeDir(): string {
  const moduleDir = path.dirname(fileURLToPath(import.meta.url));
  const localCandidate = path.join(moduleDir, 'knowledge');
  if (fs.existsSync(localCandidate)) return localCandidate;
  return path.join(process.cwd(), 'server', 'knowledge');
}

function loadKnowledgeSections(): KnowledgeSection[] {
  if (cachedSections) return cachedSections;

  const dir = resolveKnowledgeDir();
  if (!fs.existsSync(dir)) {
    cachedSections = [];
    return cachedSections;
  }

  const files = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.md'))
    .sort();

  const sections: KnowledgeSection[] = [];

  for (const file of files) {
    const raw = fs.readFileSync(path.join(dir, file), 'utf-8');
    const blocks = raw.split(/^##\s+/m).slice(1);
    for (const block of blocks) {
      const newlineIdx = block.indexOf('\n');
      if (newlineIdx === -1) continue;
      const title = block.slice(0, newlineIdx).trim();
      const body = block.slice(newlineIdx + 1).trim();
      if (!title || !body) continue;

      const mapped = SECTION_KEYWORD_MAP.find((entry) => entry.matchTitle.test(title));
      const keywords = mapped
        ? mapped.keywords
        : title
            .toLowerCase()
            .split(/[^a-z]+/)
            .filter((w) => w.length > 2);

      sections.push({
        id: `${file}:${title}`,
        title,
        body,
        keywords,
        sourceFile: file,
      });
    }
  }

  cachedSections = sections;
  return sections;
}

/**
 * Detects brief casual greetings or pleasantries that do not need heavy
 * agronomy KB injection or satellite telemetry dumps.
 */
export function isCasualGreeting(rawText: string): boolean {
  const normalized = rawText
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!normalized || normalized.length > 42) return false;

  const greetingPatterns = [
    /^(hi|hello|hey|yo|hiya|sup|howdy|greetings)(\s+tars)?(\s+there)?$/,
    /^(good\s+(morning|afternoon|evening|day))(\s+tars)?$/,
    /^(how\s+are\s+you|how\s+is\s+it\s+going|whats\s+up|what\s+is\s+up)(\s+tars)?$/,
    /^(thanks|thank\s+you|thx|ty|ok|okay|cool|nice|got\s+it|bye|goodbye)(\s+tars)?$/,
    /^(who\s+are\s+you|what\s+can\s+you\s+do|help)$/,
  ];

  return greetingPatterns.some((re) => re.test(normalized));
}

/**
 * Augments TARS's backend system prompt with targeted sections from the
 * specialized agronomy knowledge base files (/server/knowledge/*.md),
 * prioritized for the crops in the user's almanac and their current question.
 */
export function augmentPromptWithAgronomyKB(
  basePrompt: string,
  options: AugmentPromptOptions
): AugmentedPromptResult {
  const sections = loadKnowledgeSections();
  if (sections.length === 0) {
    return { augmentedPrompt: basePrompt, matchedModules: [] };
  }

  const queryLower = options.userQuery.toLowerCase();
  const almanacCropTerms: string[] = [];

  if (options.farmData) {
    almanacCropTerms.push(options.farmData.anchorCrop.toLowerCase());
    for (const step of options.farmData.rotationPlan.seasons) {
      almanacCropTerms.push(step.crop.toLowerCase());
    }
  }
  if (options.activeField?.anchorCrop) {
    almanacCropTerms.push(options.activeField.anchorCrop.toLowerCase());
  }

  const almanacText = almanacCropTerms.join(' ');
  const soilText = options.farmData
    ? `${options.farmData.soil.type} ph ${options.farmData.soil.ph} ${options.farmData.location.climateZone}`.toLowerCase()
    : '';

  // Score each specialized knowledge section against query + user's almanac crops
  const scored = sections.map((sec) => {
    let score = 0;

    for (const kw of sec.keywords) {
      if (queryLower.includes(kw)) score += 6;
      if (almanacText.includes(kw)) score += 3;
      if (soilText.includes(kw)) score += 1;
    }

    // Always favor active anchor crop directly
    if (options.farmData?.anchorCrop) {
      const anchor = options.farmData.anchorCrop.toLowerCase().replace(/s$/, '');
      if (sec.title.toLowerCase().includes(anchor)) {
        score += 4;
      }
    }

    // Prioritize water-saving practices when moisture is low or goal is water
    if (
      sec.title.includes('Water-Saving') &&
      (options.farmData?.goal === 'water' ||
        (options.farmData?.quickTip.metricsSnapshot.currentRootMoisturePct ?? 50) < 35)
    ) {
      score += 3;
    }

    // Prioritize soil pH diagnostics if farm pH is notably alkaline or acidic
    if (
      sec.title.includes('Soil pH') &&
      options.farmData &&
      (options.farmData.soil.ph >= 7.5 || options.farmData.soil.ph <= 5.8)
    ) {
      score += 3;
    }

    return { sec, score };
  });

  scored.sort((a, b) => b.score - a.score);

  // Pick top 4 most relevant knowledge modules (only meaningful matches > 0)
  const selected = scored.filter((item) => item.score > 0).slice(0, 4).map((item) => item.sec);
  if (selected.length === 0) {
    return { augmentedPrompt: basePrompt, matchedModules: [] };
  }

  const kbBlock = selected
    .map((sec) => `### ${sec.title} [${sec.sourceFile}]\n${sec.body}`)
    .join('\n\n');

  const augmentedPrompt = `${basePrompt}\n\n=== SPECIALIZED AGRONOMY KNOWLEDGE BASE (ALMANAC-MATCHED) ===\n${kbBlock}\n=== END KNOWLEDGE BASE ===`;

  return {
    augmentedPrompt,
    matchedModules: selected.map((s) => s.title),
  };
}
