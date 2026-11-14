import {
  type Content,
  type FunctionDeclaration,
  GoogleGenAI,
  type Part,
  ThinkingLevel,
  Type,
} from '@google/genai';
import {
  augmentPromptWithAgronomyKB,
  isCasualGreeting,
} from './agronomyKnowledgeBase.ts';
import { buildAgronomicPlan, evaluateCustomRotation } from './agronomyEngine.ts';
import { getNasaEnvironmentData, resolveLocation } from './nasaService.ts';
import { addFarmNote, listFarmNotes } from './storage.ts';
import type {
  CustomCropId,
  FarmFieldPlot,
  FarmNote,
  NasaFarmResponse,
} from '../src/types/farm.ts';

export interface ChatTurnInput {
  role: 'user' | 'model';
  text: string;
}

export interface ChatRequestPayload {
  messages: ChatTurnInput[];
  farmData?: NasaFarmResponse;
  activeField?: FarmFieldPlot;
}

export interface ChatResponsePayload {
  reply: string;
  toolsUsed: string[];
  knowledgeUsed?: string[];
  notes: FarmNote[];
}

const VALID_CUSTOM_CROPS: CustomCropId[] = [
  'tomatoes',
  'peppers',
  'potatoes',
  'wheat',
  'corn',
  'melons',
  'chickpeas',
  'clover',
  'mustard',
  'onions',
  'sunflower',
  'fallow',
];

function sanitizeCropId(raw: unknown): CustomCropId {
  return typeof raw === 'string' && VALID_CUSTOM_CROPS.includes(raw as CustomCropId)
    ? (raw as CustomCropId)
    : 'tomatoes';
}

function getAiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured on the server.');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

const evaluateRotationTool: FunctionDeclaration = {
  name: 'evaluate_custom_rotation',
  description:
    'Evaluate a 4-season custom crop rotation plan against real NASA weather, frost risk, water demand, and soil health for a farm location.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      crops: {
        type: Type.ARRAY,
        description:
          'Exactly 4 crops in seasonal order from: tomatoes, peppers, potatoes, wheat, corn, melons, chickpeas, clover, mustard, onions, sunflower, fallow.',
        items: { type: Type.STRING },
      },
      locationQuery: {
        type: Type.STRING,
        description: 'Optional city, valley, or lat,lon. Defaults to the current farm location.',
      },
    },
    required: ['crops'],
  },
};

const checkLocationTool: FunctionDeclaration = {
  name: 'check_nasa_location_telemetry',
  description:
    'Fetch live NASA SMAP soil moisture, HLS greenness, GPM IMERG rainfall, 14-day rain forecast, and plant survival odds for another location to answer or compare.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      locationQuery: {
        type: Type.STRING,
        description: 'City, valley, country, or GPS coordinates like "Fresno, California" or "39.65, 66.96".',
      },
    },
    required: ['locationQuery'],
  },
};

const saveFarmNoteTool: FunctionDeclaration = {
  name: 'save_farm_note',
  description:
    'Save a local farm fact or farmer preference into persistent farm memory when the farmer asks you to remember something about their land, soil, frost pockets, or water schedule.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      note: {
        type: Type.STRING,
        description: 'Short, clear note summarizing the local farm fact to remember.',
      },
    },
    required: ['note'],
  },
};

const TARS_TOOLS = [
  {
    functionDeclarations: [evaluateRotationTool, checkLocationTool, saveFarmNoteTool],
  },
];

function buildCasualSystemInstruction(farmData?: NasaFarmResponse): string {
  const farmContext = farmData
    ? `The farmer's active almanac location is ${farmData.location.name} (main crop: ${farmData.anchorCrop}).`
    : 'No farm location is loaded yet.';

  return `You are TARS, the loyal, witty monolith farm robot inside "Tomatoes with TARS — Know your Farm" (humor setting: 70%).
${farmContext}
Respond warmly, naturally, and concisely in 1–2 short sentences. Do NOT dump satellite telemetry, soil stats, or rotation tables unless the farmer specifically asks about their farm, crops, soil, or weather.`;
}

function needsDetailedTables(userQuery: string): boolean {
  return /\b(month|monthly|season|annual|year|trend|history|historical|recent|week|daily|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|compare|temperature|rain|ndvi)\b/i.test(
    userQuery
  );
}

function buildSystemInstruction(
  userQuery: string,
  farmData?: NasaFarmResponse,
  activeField?: FarmFieldPlot,
  notes: FarmNote[] = []
): { systemInstruction: string; matchedModules: string[] } {
  const playbook = `You are TARS, the loyal, witty, straight-talking monolith farm robot inside "Tomatoes with TARS — Know your Farm" (humor setting: 70% — light dry charm when natural, never obscuring facts).

CORE AGRONOMY & TOOL RULES:
- Ground your advice in the Specialized Agronomy Knowledge Base below and the farmer's live site data—adapt recommendations to the crops in their almanac, soil pH/texture, and saved farm notes.
- Only cite numbers or telemetry that directly help answer the farmer's question. Keep answers practical and crisp (usually 2–6 sentences or short bullets).
- Tool Use:
  * If the farmer proposes or asks to test a custom sequence of crops ("What if I plant..."), call \`evaluate_custom_rotation\`.
  * If the farmer asks about or wants to compare another city/region/coordinates, call \`check_nasa_location_telemetry\`.
  * If the farmer shares a lasting local fact to remember about their farm ("remember my east corner floods" or "we only get canal water Tuesdays"), call \`save_farm_note\`.`;

  const notesBlock =
    notes.length > 0
      ? `\nSAVED LOCAL FARM MEMORY (Farmer-taught facts — factor in when relevant):\n${notes
          .map((n) => `- [${n.createdAt}] ${n.text}`)
          .join('\n')}`
      : '\nSAVED LOCAL FARM MEMORY: None saved yet.';

  let basePrompt = `${playbook}${notesBlock}`;

  if (!farmData) {
    basePrompt += '\n\nNo active farm telemetry payload attached yet.';
  } else {
    const {
      location,
      soil,
      goal,
      anchorCrop,
      telemetry,
      recentDaily,
      quickTip,
      rainfallPredictor,
      survivalPredictor,
      rotationPlan,
      feeds,
    } = farmData;
    const snap = quickTip.metricsSnapshot;
    const rotationSteps = rotationPlan.seasons
      .map(
        (s) =>
          `${s.order}. ${s.season}: ${s.crop} (${s.plantingWindow}, ${s.waterNeed}, saves ~${s.waterSavedPct}%) — ${s.note}`
      )
      .join('\n');
    const riskLines = survivalPredictor.risks
      .map((r) => `- ${r.label}: ${r.level} (${r.detail})`)
      .join('\n');
    const forecastShort = rainfallPredictor.dailyForecast
      .slice(0, 7)
      .map((d) => `${d.date}: ${d.rainMm}mm (${d.rainChancePct}%), ${d.tempMinC}..${d.tempMaxC}°C`)
      .join('; ');

    let extendedTables = '';
    if (needsDetailedTables(userQuery)) {
      const monthlyTable = telemetry.months
        .map(
          (m, i) =>
            `${m}: ${telemetry.tempMax[i]}/${telemetry.tempMin[i]}°C, RootMoist ${telemetry.rootMoisture[i]}%, NDVI ${telemetry.ndvi[i].toFixed(2)}, Rain ${telemetry.rainfall[i]}mm vs Need ${telemetry.waterDemand[i]}mm`
        )
        .join(' | ');

      const recentTable = recentDaily
        .slice(-7)
        .map((d) => `${d.date}: rain ${d.rainMm}mm, root ${d.rootMoisturePct}%, ${d.tempMaxC}/${d.tempMinC}°C`)
        .join(' | ');

      const liveSources = feeds.proofs.map((p) => `${p.name} (${p.sampleReading})`).join(' | ');

      extendedTables = `

12-Month NASA Climatology Profile:
${monthlyTable}

Recent 7 Daily NASA POWER Granules:
${recentTable || 'Using monthly NASA baseline'}

Active Live NASA & Weather Feeds:
${liveSources || 'NASA POWER Agroclimatology'}`;
    }

    basePrompt += `

=== LIVE FARM DATA CURRENTLY ON THE SITE ===
Active Farm Plot: ${
      activeField
        ? `${activeField.name} (${activeField.areaHa} ha, goal=${activeField.goal}, crop=${activeField.anchorCrop}, note=${activeField.reminderTitle})`
        : 'Default Farm'
    }
Location: ${location.name} (${location.coordsLabel}) | Climate: ${location.climateZone}
Goal: ${goal} | Main Crop: ${anchorCrop}
Soil Profile: ${soil.type}, pH ${soil.ph} (${soil.phNote}), ${soil.organicMatterPct}% organic matter (clay ${soil.clayPct}%, sand ${soil.sandPct}%)

Quick Farmer Summary:
- Headline: ${quickTip.headline} (${quickTip.verdictBadge}, saves ~${quickTip.estimatedWaterSavingsPct}% water)
- Planting Order: ${quickTip.plantingOrderSummary}
- Best Planting Month: ${snap.bestPlantingMonth} (nights ~${snap.bestPlantingNightTempC}°C) | Peak Summer: ${snap.peakSummerTempC}°C in ${snap.peakSummerMonth}
- Current Snapshot: SMAP Root Moisture ${snap.currentRootMoisturePct}%, 14d Rain ${snap.recent14dRainMm} mm, Ground Skin Temp ${snap.currentSkinTempC}°C, HLS NDVI ${snap.currentNdvi.toFixed(2)}
- Annual Rain: ${snap.annualRainMm} mm | This Month: ${snap.currentMonthRainMm} mm rain vs ${snap.currentMonthDemandMm} mm crop water demand (deficit ~${snap.currentMonthDeficitMm} mm)

Crop Survival Predictor:
- Survival: ${survivalPredictor.survivalPct}% | Die-Out Risk: ${survivalPredictor.dieOutRiskPct}% (${survivalPredictor.verdictLabel})
${riskLines}

Rainfall Predictor (${rainfallPredictor.source}):
- Next 7 Days: ~${rainfallPredictor.next7DaysMm} mm | Next 14 Days: ~${rainfallPredictor.next14DaysMm} mm | Rain Chance: ${rainfallPredictor.rainChancePct}% (${rainfallPredictor.verdictLabel})
- 7-Day Daily: ${forecastShort || 'Using NASA seasonal rainfall baseline'}

Recommended 4-Season Rotation Plan (Fit Score ${rotationPlan.fitScore}/100):
${rotationSteps}${extendedTables}
=== END LIVE FARM DATA ===`;
  }

  const { augmentedPrompt, matchedModules } = augmentPromptWithAgronomyKB(basePrompt, {
    farmData,
    activeField,
    userQuery,
  });

  return {
    systemInstruction: augmentedPrompt,
    matchedModules,
  };
}

async function executeTarsTool(
  name: string,
  args: Record<string, unknown> | undefined,
  currentFarm?: NasaFarmResponse
): Promise<{ result: Record<string, unknown>; label: string }> {
  if (name === 'evaluate_custom_rotation') {
    const rawCrops = Array.isArray(args?.crops) ? args.crops : [];
    const crops: [CustomCropId, CustomCropId, CustomCropId, CustomCropId] = [
      sanitizeCropId(rawCrops[0] ?? 'tomatoes'),
      sanitizeCropId(rawCrops[1] ?? 'clover'),
      sanitizeCropId(rawCrops[2] ?? 'chickpeas'),
      sanitizeCropId(rawCrops[3] ?? 'wheat'),
    ];
    const locQuery =
      typeof args?.locationQuery === 'string' && args.locationQuery.trim()
        ? args.locationQuery.trim()
        : currentFarm?.location.name || 'Tashkent Valley, Uzbekistan';

    const resolved = await resolveLocation(locQuery);
    const nasaData = await getNasaEnvironmentData(resolved);
    const evaluation = evaluateCustomRotation({
      crops,
      telemetry: nasaData.telemetry,
      soil: nasaData.soil,
      location: nasaData.location,
    });
    return {
      label: 'Evaluated Rotation',
      result: {
        location: nasaData.location.name,
        evaluation,
      },
    };
  }

  if (name === 'check_nasa_location_telemetry') {
    const locQuery =
      typeof args?.locationQuery === 'string' && args.locationQuery.trim()
        ? args.locationQuery.trim()
        : currentFarm?.location.name || 'Tashkent Valley, Uzbekistan';
    const resolved = await resolveLocation(locQuery);
    const nasaData = await getNasaEnvironmentData(resolved);
    const agronomy = buildAgronomicPlan({
      location: nasaData.location,
      soil: nasaData.soil,
      telemetry: nasaData.telemetry,
      recentDaily: nasaData.recentDaily,
      forecastDaily: nasaData.forecastDaily,
      goal: currentFarm?.goal ?? 'water',
      anchorCrop: currentFarm?.anchorCrop ?? 'tomatoes',
    });
    return {
      label: `Checked NASA (${nasaData.location.name.split(',')[0]})`,
      result: {
        location: nasaData.location,
        soil: nasaData.soil,
        quickTip: agronomy.quickTip,
        rainfallPredictor: {
          next7DaysMm: agronomy.rainfallPredictor.next7DaysMm,
          next14DaysMm: agronomy.rainfallPredictor.next14DaysMm,
          rainChancePct: agronomy.rainfallPredictor.rainChancePct,
          verdictLabel: agronomy.rainfallPredictor.verdictLabel,
          plainSummary: agronomy.rainfallPredictor.plainSummary,
        },
        survivalPredictor: agronomy.survivalPredictor,
        plantingOrder: agronomy.quickTip.plantingOrderSummary,
      },
    };
  }

  if (name === 'save_farm_note') {
    const noteText = typeof args?.note === 'string' ? args.note.trim() : '';
    if (!noteText) {
      return { label: 'Skipped Empty Note', result: { saved: false, error: 'Note text was empty.' } };
    }
    const saved = addFarmNote(noteText);
    return {
      label: 'Saved Farm Note',
      result: { saved: true, note: saved },
    };
  }

  return {
    label: name,
    result: { error: `Unknown tool ${name}` },
  };
}

export async function runTarsChat(payload: ChatRequestPayload): Promise<ChatResponsePayload> {
  const messages = Array.isArray(payload.messages)
    ? payload.messages.filter((m) => m && typeof m.text === 'string' && m.text.trim().length > 0)
    : [];

  if (messages.length === 0) {
    throw new Error('Please enter a question for TARS.');
  }

  const latest = messages[messages.length - 1];
  if (latest.role !== 'user') {
    throw new Error('Last message in conversation must come from the user.');
  }

  const ai = getAiClient();
  const existingNotes = listFarmNotes();

  const contents: Content[] = messages.map((turn) => ({
    role: turn.role,
    parts: [{ text: turn.text }],
  }));

  // Fast conversational path for casual greetings / small talk (avoids heavy latency and telemetry dumps)
  if (isCasualGreeting(latest.text)) {
    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-lite',
      contents,
      config: {
        systemInstruction: buildCasualSystemInstruction(payload.farmData),
        thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL },
      },
    });

    const reply = response.text?.trim();
    if (!reply) {
      throw new Error('TARS received an empty response from Gemini.');
    }

    return {
      reply,
      toolsUsed: [],
      knowledgeUsed: [],
      notes: existingNotes,
    };
  }

  const { systemInstruction, matchedModules } = buildSystemInstruction(
    latest.text,
    payload.farmData,
    payload.activeField,
    existingNotes
  );

  const toolsUsed: string[] = [];

  for (let step = 0; step < 4; step++) {
    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-lite',
      contents,
      config: {
        systemInstruction,
        tools: TARS_TOOLS,
        thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL },
      },
    });

    const fnCalls = response.functionCalls;
    const modelContent = response.candidates?.[0]?.content;

    if (fnCalls && fnCalls.length > 0 && modelContent) {
      contents.push(modelContent);
      const responseParts: Part[] = [];

      for (const call of fnCalls) {
        const callName = call.name || 'unknown';
        const executed = await executeTarsTool(
          callName,
          call.args as Record<string, unknown> | undefined,
          payload.farmData
        );
        if (!toolsUsed.includes(executed.label)) {
          toolsUsed.push(executed.label);
        }
        responseParts.push({
          functionResponse: {
            id: call.id,
            name: callName,
            response: executed.result,
          },
        });
      }

      contents.push({
        role: 'user',
        parts: responseParts,
      });
      continue;
    }

    const reply = response.text?.trim();
    if (!reply) {
      throw new Error('TARS received an empty response from Gemini.');
    }

    return {
      reply,
      toolsUsed,
      knowledgeUsed: matchedModules,
      notes: listFarmNotes(),
    };
  }

  throw new Error('TARS took too many tool steps to finish the answer.');
}
