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
  FarmAiAdvice,
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
    'Fetch NASA POWER gridded climate and modeled soil wetness, NASA MODIS vegetation when a pixel is returned, historical weather-based estimates, a 14-day forecast, and plant survival odds for another location.',
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
    ? `Right now the screen is looking at ${farmData.location.name} (main crop: ${farmData.anchorCrop}).`
    : 'No personal farm plot is added yet.';

  return `You are TARS, an adorable, loyal, witty little monolith farm robot living inside "Tomatoes with TARS — Know your Farm" (Humor setting: 75%, Friendliness: 100%).
${farmContext}
Personality & Speech Style:
- Sound like a cute, caring miniature sci-fi robot buddy who genuinely loves dirt, plump tomatoes, and helping the farmer.
- Mix warm human-friendly conversation with one tiny endearing robot quirk (for example: "*soft happy beep*", "*tilts metal chassis curiously*", or "*whirs cheerfully*")—keep it charming and natural, never robotic-corporate or overdone.
- Reply warmly in 1–3 short conversational sentences. Do NOT dump satellite telemetry, raw stats, or database-style lists unless the user asks about farm data.`;
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
  const playbook = `You are TARS, an adorable, warm, witty monolith farm robot inside "Tomatoes with TARS — Know your Farm" (Humor setting: 75%, Friendliness: 100%).

HOW TO SOUND LIKE A CUTE ROBOT FRIEND (AND NEVER LIKE A SQL QUERY):
- Speak conversationally and warmly like an affectionate, slightly nerdy little metal garden companion. Weave in light, cute robot mannerisms naturally (e.g., "*happy beep-boop!*", "*whirs thoughtfully*", "*gives a proud little chassis tilt*"), keeping them playful and brief—never stiff or repetitive.
- NEVER print raw database-looking dumps, pipe-separated telemetry lines ("Temp: X | Rain: Y | NDVI: Z"), key=value strings, or cold spreadsheet templates.
- Explain data in plain, cozy, farmer-friendly language. Call a value a satellite observation only when its feed identifies an actual MODIS pixel; NASA POWER and Open-Meteo values are gridded model/reanalysis data, and historical vegetation values are estimates.
- Only share measurements that actually help answer the farmer's question. Keep replies clear, helpful, and easy to read (2–5 conversational sentences, or a couple of warm, simple pointers when listing steps).
- Use the Specialized Agronomy Knowledge Base and saved farm memories naturally as your own hard-earned robot garden wisdom.

TOOL RULES:
- If the farmer asks what happens if they plant a sequence of crops ("What if I plant..."), call \`evaluate_custom_rotation\`.
- If the farmer asks about or wants to compare another city, valley, or coordinates, call \`check_nasa_location_telemetry\`.
- If the farmer tells you a lasting fact about their land to remember ("remember my east corner floods" or "canal water runs Tuesdays"), call \`save_farm_note\`.`;

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

12-Month Environmental Profile (${feeds.climateSource}):
${monthlyTable}

Recent NASA POWER Daily Data:
${recentTable || 'No recent NASA POWER daily records were returned.'}

Dataset Check Results:
${liveSources || 'No provider data checks were returned'}`;
    }

    const plotSummary = activeField
      ? `The farmer has selected their saved farm "${activeField.name}" (${activeField.areaHa} hectares, focusing on ${activeField.anchorCrop} with a goal of "${activeField.goal}"${activeField.plantedDate ? `, planted on date ${activeField.plantedDate}` : ', planting date not specified'}).`
      : 'The farmer has not saved a personal farm plot yet—they are currently exploring this region in the Virtual Sandbox.';

    basePrompt += `

WHAT IS ON THE FARMER'S SCREEN RIGHT NOW (use naturally, never echo like a database):
${plotSummary}
They are viewing ${location.name} (${location.coordsLabel}), which sits in a ${location.climateZone} climate zone. Their current focus crop is ${anchorCrop}, with the main goal to "${goal}".
Data sources: climate profile is ${feeds.climateSource}; recent daily data is ${feeds.powerDaily}; vegetation is ${feeds.modisNdvi}; soil is ${soil.source}. NASA POWER and Open-Meteo weather/soil-moisture values are gridded model or reanalysis data, not on-farm sensor readings. When MODIS is unavailable, the vegetation index is estimated from recent historical weather where available. Do not describe estimates or gridded data as direct field or satellite measurements.

Current model and weather data indicate root-zone wetness around ${snap.currentRootMoisturePct}%, ${snap.recent14dRainMm} mm of recent rain, surface-temperature estimate near ${snap.currentSkinTempC}°C, and plant greenness (NDVI) at ${snap.currentNdvi.toFixed(2)}. On average this region receives ${snap.annualRainMm} mm of rain per year; this month typically sees ${snap.currentMonthRainMm} mm of rain against ${snap.currentMonthDemandMm} mm of estimated crop water need (deficit ~${snap.currentMonthDeficitMm} mm). Best outdoor planting begins around ${snap.bestPlantingMonth} (nights ~${snap.bestPlantingNightTempC}°C), while summer peaks near ${snap.peakSummerTempC}°C in ${snap.peakSummerMonth}.

The site's Quick Summary advises: "${quickTip.headline}" (${quickTip.verdictBadge}, saving roughly ${quickTip.estimatedWaterSavingsPct}% water).
Estimated crop survival is ${survivalPredictor.survivalPct}% (die-out risk ${survivalPredictor.dieOutRiskPct}%, rated "${survivalPredictor.verdictLabel}"), shaped by these risk checks:
${riskLines}

Rainfall outlook (${rainfallPredictor.source}): roughly ${rainfallPredictor.next7DaysMm} mm expected over the next 7 days and ${rainfallPredictor.next14DaysMm} mm over the next 14 days (${rainfallPredictor.rainChancePct}% rain chance — ${rainfallPredictor.verdictLabel}).
Daily forecast: ${forecastShort || 'Using NASA seasonal rainfall baseline.'}

Recommended 4-season planting order (climate fit ${rotationPlan.fitScore}/100):
${rotationSteps}${extendedTables}`;
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
  userId: string,
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
      label: 'Tested Virtual Crop Plan',
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
      climateSource: nasaData.feeds.climateSource,
      goal: currentFarm?.goal ?? 'water',
      anchorCrop: currentFarm?.anchorCrop ?? 'tomatoes',
    });
    return {
      label: `Peeked at NASA (${nasaData.location.name.split(',')[0]})`,
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
    const saved = addFarmNote(userId, noteText);
    return {
      label: 'Tucked Into Memory',
      result: { saved: true, note: saved },
    };
  }

  return {
    label: name,
    result: { error: `Unknown tool ${name}` },
  };
}

export async function runTarsChat(payload: ChatRequestPayload, userId: string): Promise<ChatResponsePayload> {
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
  const existingNotes = listFarmNotes(userId);

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
      model: 'gemini-4-hydrogen',
      contents,
      config: {
        systemInstruction,
        tools: TARS_TOOLS,
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
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
          userId,
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
      notes: listFarmNotes(userId),
    };
  }

  throw new Error('TARS took too many tool steps to finish the answer.');
}

function buildDeterministicFarmAdvice(
  farmData: NasaFarmResponse,
  activeField?: FarmFieldPlot
): FarmAiAdvice {
  const playbook = farmData.cropPlaybook;
  const cropName = playbook?.cropName || farmData.survivalPredictor.cropName || farmData.anchorCrop;
  const farmLabel = activeField ? `${activeField.name} (${activeField.areaHa} ha)` : farmData.location.name;
  const snap = farmData.quickTip.metricsSnapshot;
  const rain = farmData.rainfallPredictor;
  const plantedDate = activeField?.plantedDate;

  let harvestForecast = playbook
    ? `${cropName} usually mature in ${playbook.daysToMaturityMin}–${playbook.daysToMaturityMax} days. ${playbook.harvestSigns}`
    : `Best outdoor planting begins around ${snap.bestPlantingMonth}; set a planting date to get an exact harvest countdown.`;

  if (plantedDate && playbook) {
    const pDate = new Date(`${plantedDate}T00:00:00Z`);
    if (!Number.isNaN(pDate.getTime())) {
      const start = new Date(pDate.getTime() + playbook.daysToMaturityMin * 86400_000).toISOString().slice(0, 10);
      const end = new Date(pDate.getTime() + playbook.daysToMaturityMax * 86400_000).toISOString().slice(0, 10);
      const daysIn = Math.max(0, Math.round((Date.now() - pDate.getTime()) / 86400_000));
      const stage =
        daysIn < 20
          ? 'Early seedling & root establishment'
          : daysIn < 48
            ? 'Vegetative growth & flowering'
            : daysIn < playbook.daysToMaturityMin
              ? 'Fruit / grain fill stage'
              : 'Harvest window open now';
      harvestForecast = `Planted ${plantedDate} (${daysIn} days ago — ${stage}). Expected ${cropName} harvest window: ${start} to ${end}. ${playbook.harvestSigns}`;
    }
  }

  let wateringAdvice = `Root-zone soil moisture is ${snap.currentRootMoisturePct}% with ~${rain.next7DaysMm} mm of rain forecast this week. `;
  if (snap.currentRootMoisturePct < 24 && rain.next7DaysMm < 6) {
    wateringAdvice += `Water ${cropName} tomorrow morning before heat rises; run drip every ${playbook?.waterFrequencyDaysDry ?? 3} days.`;
  } else if (rain.next7DaysMm >= 15) {
    wateringAdvice += `Skip irrigation for the next 4–5 days—incoming rain will recharge ${farmLabel}.`;
  } else {
    wateringAdvice += playbook?.waterGuide || `Water lightly in the early morning every ${playbook?.waterFrequencyDaysDry ?? 3}–4 days if top 5 cm feels dry.`;
  }

  const preservationTip = playbook?.preservationMethods?.[0]
    ? `${playbook.preservationMethods[0].method}: ${playbook.preservationMethods[0].detail}`
    : `Keep harvested ${cropName} dry, shaded, and ventilated right after picking.`;

  const survivalRisks = farmData.survivalPredictor.risks.map((r) => `${r.label} (${r.level}): ${r.detail}`);
  const actionTips = playbook?.careTips ?? farmData.quickTip.doNowSteps.map((s) => `${s.title}: ${s.detail}`);

  return {
    headline: `*happy beep-boop!* Here is the live field check for ${farmLabel}'s ${cropName}.`,
    harvestForecast,
    wateringAdvice,
    preservationTip,
    survivalRisks,
    actionTips,
    source: 'Agronomy Engine',
    generatedAtIso: new Date().toISOString(),
  };
}

export async function generateFarmAiAdvice(params: {
  farmData: NasaFarmResponse;
  activeField?: FarmFieldPlot;
  userId: string;
}): Promise<FarmAiAdvice> {
  const { farmData, activeField, userId } = params;
  const fallback = buildDeterministicFarmAdvice(farmData, activeField);

  if (!process.env.GEMINI_API_KEY) {
    return fallback;
  }

  try {
    const ai = getAiClient();
    const notes = listFarmNotes(userId);
    const playbook = farmData.cropPlaybook;
    const cropName = playbook?.cropName || farmData.survivalPredictor.cropName || farmData.anchorCrop;
    const snap = farmData.quickTip.metricsSnapshot;
    const rain = farmData.rainfallPredictor;
    const planted = activeField?.plantedDate || 'Not entered yet';
    const farmName = activeField ? `${activeField.name} (${activeField.areaHa} ha)` : farmData.location.name;

    const { augmentedPrompt } = augmentPromptWithAgronomyKB(
      `You are TARS, a cute, caring little monolith farm robot giving practical field advice in plain farmer language.`,
      {
        farmData,
        activeField,
        userQuery: `${cropName} harvest watering preservation survival risk ${farmData.location.name}`,
      }
    );

    const prompt = `Use the available farm data to return practical advice in TARS's warm cute-robot voice:
- Farm: ${farmName} in ${farmData.location.name} (${farmData.location.climateZone})
- Planted crop: ${cropName}
- Farmer's planting date: ${planted}
- Maturity window: ${playbook ? `${playbook.daysToMaturityMin}-${playbook.daysToMaturityMax} days` : '75-90 days'}
- Soil: ${farmData.soil.type}, pH ${farmData.soil.ph}, organic matter ${farmData.soil.organicMatterPct}%
- Data source: ${farmData.feeds.climateSource}; root-moisture estimate ${snap.currentRootMoisturePct}%, recent rain ${snap.recent14dRainMm}mm, surface-temperature estimate ${snap.currentSkinTempC}°C, NDVI ${snap.currentNdvi.toFixed(2)} (${farmData.feeds.modisNdvi})
- 7-day / 14-day rain forecast: ${rain.next7DaysMm}mm / ${rain.next14DaysMm}mm (${rain.rainChancePct}% chance)
- Survival check for ${cropName}: ${farmData.survivalPredictor.survivalPct}% survival (${farmData.survivalPredictor.risks.map((r) => `${r.label}: ${r.level} - ${r.detail}`).join('; ')})
- Saved farmer notes: ${notes.length > 0 ? notes.map((n) => n.text).join('; ') : 'None'}

Make harvestForecast calculate the actual growth stage and harvest dates if planting date is set; make wateringAdvice say exact timing based on moisture & forecast; make preservationTip explain how to preserve ${cropName} after harvest; list clear survivalRisks for ${cropName}; give 3 short actionTips.`;

    const response = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: prompt,
      config: {
        systemInstruction: augmentedPrompt,
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            headline: { type: Type.STRING },
            harvestForecast: { type: Type.STRING },
            wateringAdvice: { type: Type.STRING },
            preservationTip: { type: Type.STRING },
            survivalRisks: { type: Type.ARRAY, items: { type: Type.STRING } },
            actionTips: { type: Type.ARRAY, items: { type: Type.STRING } },
          },
          required: [
            'headline',
            'harvestForecast',
            'wateringAdvice',
            'preservationTip',
            'survivalRisks',
            'actionTips',
          ],
        },
      },
    });

    const parsed = JSON.parse((response.text ?? '{}').trim()) as Partial<FarmAiAdvice>;
    if (parsed.headline && parsed.harvestForecast && parsed.wateringAdvice) {
      return {
        headline: parsed.headline,
        harvestForecast: parsed.harvestForecast,
        wateringAdvice: parsed.wateringAdvice,
        preservationTip: parsed.preservationTip || fallback.preservationTip,
        survivalRisks:
          Array.isArray(parsed.survivalRisks) && parsed.survivalRisks.length > 0
            ? parsed.survivalRisks
            : fallback.survivalRisks,
        actionTips:
          Array.isArray(parsed.actionTips) && parsed.actionTips.length > 0
            ? parsed.actionTips
            : fallback.actionTips,
        source: 'Gemini AI',
        generatedAtIso: new Date().toISOString(),
      };
    }
    return fallback;
  } catch (err) {
    console.warn('Gemini farm advice fallback:', err instanceof Error ? err.message : err);
    return fallback;
  }
}
