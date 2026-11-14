import { GoogleGenAI, type Content } from '@google/genai';
import type { FarmFieldPlot, NasaFarmResponse } from '../src/types/farm.ts';

export interface ChatTurnInput {
  role: 'user' | 'model';
  text: string;
}

export interface ChatRequestPayload {
  messages: ChatTurnInput[];
  farmData?: NasaFarmResponse;
  activeField?: FarmFieldPlot;
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

function buildSystemInstruction(farmData?: NasaFarmResponse, activeField?: FarmFieldPlot): string {
  const basePersona =
    `You are TARS, the loyal, witty, straight-talking monolith farm robot inside "Tomatoes with TARS — Know your Farm". ` +
    `Your humor setting is 70% (light dry charm when natural, never obscuring facts). ` +
    `Keep answers clear, plain-language, practical for farmers, and grounded strictly in the live site data provided below. ` +
    `When quoting numbers (rainfall mm, survival %, soil moisture %, dates, crop rotation order, or NASA satellite sources), cite the exact values from the site context. ` +
    `Keep responses concise (usually 2-5 short sentences or brief bullet points) unless the farmer asks for more detail.`;

  if (!farmData) {
    return `${basePersona}\n\nNo farm telemetry payload was attached yet; answer general crop rotation and water-saving farming questions clearly.`;
  }

  const { location, soil, goal, anchorCrop, quickTip, rainfallPredictor, survivalPredictor, rotationPlan, feeds } =
    farmData;
  const snap = quickTip.metricsSnapshot;
  const liveSources = feeds.proofs.map((p) => `${p.name} (${p.sampleReading})`).join(' | ');
  const rotationSteps = rotationPlan.seasons
    .map((s) => `${s.order}. ${s.season}: ${s.crop} (${s.plantingWindow}, ${s.waterNeed}, saves ~${s.waterSavedPct}% water)`)
    .join('\n');
  const riskLines = survivalPredictor.risks.map((r) => `- ${r.label}: ${r.level} (${r.detail})`).join('\n');
  const forecastShort = rainfallPredictor.dailyForecast
    .slice(0, 7)
    .map((d) => `${d.date}: ${d.rainMm}mm rain, ${d.tempMinC}..${d.tempMaxC}°C`)
    .join('; ');

  return `${basePersona}

=== LIVE FARM DATA CURRENTLY ON THE SITE ===
Active Farm Plot: ${activeField ? `${activeField.name} (${activeField.areaHa} ha, goal=${activeField.goal}, crop=${activeField.anchorCrop})` : 'Default Farm'}
Location: ${location.name} (${location.coordsLabel}) | Climate: ${location.climateZone}
Goal: ${goal} | Main Crop: ${anchorCrop}
Soil Profile: ${soil.type}, pH ${soil.ph} (${soil.phNote}), ${soil.organicMatterPct}% organic matter (clay ${soil.clayPct}%, sand ${soil.sandPct}%)

Quick Farmer Summary:
- Headline: ${quickTip.headline}
- Status Badge: ${quickTip.verdictBadge}
- Estimated Water Savings: ~${quickTip.estimatedWaterSavingsPct}%
- Summary: ${quickTip.summary}
- Recommended Planting Order: ${quickTip.plantingOrderSummary}
- Best Planting Window: ${snap.bestPlantingMonth} (nights ~${snap.bestPlantingNightTempC}°C) | Peak Summer: ${snap.peakSummerTempC}°C in ${snap.peakSummerMonth}
- Current Root-Zone Soil Moisture (SMAP): ${snap.currentRootMoisturePct}% | Recent 14-day rain: ${snap.recent14dRainMm} mm | Ground Skin Temp: ${snap.currentSkinTempC}°C | Plot NDVI (HLS): ${snap.currentNdvi.toFixed(2)}
- Annual Rainfall: ${snap.annualRainMm} mm | This Month Rain vs Crop Need: ${snap.currentMonthRainMm} mm rain vs ${snap.currentMonthDemandMm} mm demand (deficit ~${snap.currentMonthDeficitMm} mm)

Crop Survival Predictor:
- Chance of Thriving: ${survivalPredictor.survivalPct}% | Die-Out Risk: ${survivalPredictor.dieOutRiskPct}% (${survivalPredictor.verdictLabel})
- Summary: ${survivalPredictor.willSurviveSummary}
${riskLines}

Rainfall Predictor (${rainfallPredictor.source}):
- Next 7 Days: ~${rainfallPredictor.next7DaysMm} mm | Next 14 Days: ~${rainfallPredictor.next14DaysMm} mm | Rain Chance: ${rainfallPredictor.rainChancePct}%
- Verdict: ${rainfallPredictor.verdictLabel} — ${rainfallPredictor.plainSummary}
- 7-Day Outlook: ${forecastShort || 'Using NASA seasonal rainfall baseline'}

Recommended 4-Season Rotation Plan (Fit Score ${rotationPlan.fitScore}/100):
${rotationSteps}

Live NASA & Weather Feeds Active Right Now:
${liveSources || 'NASA POWER Agroclimatology'}
=== END LIVE FARM DATA ===`;
}

export async function runTarsChat(payload: ChatRequestPayload): Promise<string> {
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

  const priorTurns = messages.slice(0, -1);
  const history: Content[] = priorTurns.map((turn) => ({
    role: turn.role,
    parts: [{ text: turn.text }],
  }));

  const ai = getAiClient();
  const systemInstruction = buildSystemInstruction(payload.farmData, payload.activeField);

  const chat = ai.chats.create({
    model: 'gemini-4-hydrogen',
    history,
    config: {
      systemInstruction,
    },
  });

  const response = await chat.sendMessage({
    message: latest.text,
  });

  const reply = response.text?.trim();
  if (!reply) {
    throw new Error('TARS received an empty response from Gemini.');
  }
  return reply;
}
