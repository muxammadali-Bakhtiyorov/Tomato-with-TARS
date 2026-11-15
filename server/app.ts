import express from 'express';
import { createClient } from '@supabase/supabase-js';
import { buildAgronomicPlan, evaluateCustomRotation } from './agronomyEngine.ts';
import { generateFarmAiAdvice, runTarsChat, type ChatRequestPayload } from './geminiService.ts';
import { estimateSandboxEconomics, getCountryMarketDataset } from './marketService.ts';
import { getNasaEnvironmentData, resolveLocation } from './nasaService.ts';
import {
  addFarmNote,
  addFieldPlot,
  deleteFarmNote,
  deleteSavedPlan,
  listFarmNotes,
  listFields,
  listSavedPlans,
  removeFieldPlot,
  saveFarmPlan,
  updateFieldPlot,
} from './storage.ts';
import type {
  AnchorCrop,
  CustomCropId,
  FarmFieldPlot,
  NasaFarmResponse,
  RotationGoal,
} from '../src/types/farm.ts';

const VALID_GOALS: RotationGoal[] = ['water', 'nitrogen', 'pest'];
const VALID_CROPS: AnchorCrop[] = ['tomatoes', 'peppers', 'potatoes', 'wheat', 'corn', 'melons'];
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

function parseGoal(raw: unknown): RotationGoal {
  return typeof raw === 'string' && VALID_GOALS.includes(raw as RotationGoal)
    ? (raw as RotationGoal)
    : 'water';
}

function parseCrop(raw: unknown): AnchorCrop {
  return typeof raw === 'string' && VALID_CROPS.includes(raw as AnchorCrop)
    ? (raw as AnchorCrop)
    : 'tomatoes';
}

function parseCustomCrop(raw: unknown): CustomCropId {
  return typeof raw === 'string' && VALID_CUSTOM_CROPS.includes(raw as CustomCropId)
    ? (raw as CustomCropId)
    : 'tomatoes';
}

function getAuthUserId(res: express.Response): string {
  const userId: unknown = res.locals.userId;
  if (typeof userId !== 'string') throw new Error('Authenticated user is missing.');
  return userId;
}

export function createApiApp() {
  const app = express();
  app.use(express.json());

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, service: 'Tomatoes with TARS NASA Almanac' });
  });

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseKey =
    process.env.SUPABASE_ANON_KEY ||
    process.env.SUPABASE_PUBLISHABLE_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY;
  const supabaseAuth =
    supabaseUrl && supabaseKey
      ? createClient(supabaseUrl, supabaseKey, {
          auth: { autoRefreshToken: false, persistSession: false },
        })
      : null;

  app.use('/api', async (req, res, next) => {
    if (!supabaseAuth) {
      res.status(503).json({ error: 'Supabase authentication is not configured on the server.' });
      return;
    }

    const token = req.header('authorization')?.match(/^Bearer\s+(.+)$/i)?.[1];
    if (!token) {
      res.status(401).json({ error: 'Sign in is required.' });
      return;
    }

    try {
      const { data, error } = await supabaseAuth.auth.getUser(token);
      if (error || !data.user) {
        const status = error && typeof error.status === 'number' && error.status >= 500 ? 503 : 401;
        res.status(status).json({
          error: status === 401 ? 'Your session is invalid or expired.' : 'Unable to verify your session.',
        });
        return;
      }
      res.locals.userId = data.user.id;
      next();
    } catch (error) {
      console.error('Supabase session verification failed:', error);
      res.status(503).json({ error: 'Unable to verify your session.' });
    }
  });

  app.get('/api/nasa/telemetry', async (req, res) => {
    try {
      const q = typeof req.query.q === 'string' ? req.query.q : undefined;
      const latRaw = typeof req.query.lat === 'string' ? Number(req.query.lat) : undefined;
      const lonRaw = typeof req.query.lon === 'string' ? Number(req.query.lon) : undefined;
      const goal = parseGoal(req.query.goal);
      const anchorCrop = parseCrop(req.query.crop);
      const farmName = typeof req.query.farmName === 'string' ? req.query.farmName : undefined;
      const areaHa = typeof req.query.areaHa === 'string' ? Number(req.query.areaHa) : undefined;
      const plantedDate = typeof req.query.plantedDate === 'string' ? req.query.plantedDate : undefined;
      const forceRefresh = req.query.refresh === '1';

      const resolved = await resolveLocation(
        q,
        Number.isFinite(latRaw) ? latRaw : undefined,
        Number.isFinite(lonRaw) ? lonRaw : undefined
      );

      const nasaData = await getNasaEnvironmentData(resolved, { forceRefresh });
      const agronomy = buildAgronomicPlan({
        location: nasaData.location,
        soil: nasaData.soil,
        telemetry: nasaData.telemetry,
        recentDaily: nasaData.recentDaily,
        forecastDaily: nasaData.forecastDaily,
        climateSource: nasaData.feeds.climateSource,
        goal,
        anchorCrop,
        farmName,
        areaHa: Number.isFinite(areaHa) ? areaHa : undefined,
        plantedDate,
      });

      const response: NasaFarmResponse = {
        location: nasaData.location,
        soil: nasaData.soil,
        goal,
        anchorCrop,
        cropPlaybook: agronomy.cropPlaybook,
        telemetry: nasaData.telemetry,
        recentDaily: nasaData.recentDaily,
        rainfallPredictor: agronomy.rainfallPredictor,
        survivalPredictor: agronomy.survivalPredictor,
        quickTip: agronomy.quickTip,
        rotationPlan: agronomy.rotationPlan,
        trajectory: agronomy.trajectory,
        radar: agronomy.radar,
        feeds: nasaData.feeds,
      };

      res.json(response);
    } catch (err) {
      console.error('NASA telemetry route error:', err);
      res.status(500).json({ error: 'Unable to fetch NASA farm telemetry' });
    }
  });

  // Live auto-updating per-country agricultural market dataset (Live FX + World Bank index)
  app.get('/api/market', async (req, res) => {
    try {
      const q = typeof req.query.q === 'string' ? req.query.q : undefined;
      const countryCode = typeof req.query.countryCode === 'string' ? req.query.countryCode : undefined;
      const countryName = typeof req.query.countryName === 'string' ? req.query.countryName : undefined;
      const forceRefresh = req.query.refresh === '1' || req.query.refresh === 'true';

      const resolved = q ? await resolveLocation(q) : null;
      const dataset = await getCountryMarketDataset({
        countryCode: countryCode || resolved?.countryCode,
        countryName: countryName || resolved?.countryName,
        locationName: resolved?.name || q,
        forceRefresh,
      });

      res.json(dataset);
    } catch (err) {
      console.error('Market dataset error:', err);
      res.status(500).json({ error: 'Unable to load country market dataset' });
    }
  });

  // Evaluate a custom rotation against available environmental data and country market economics
  app.post('/api/rotations/evaluate', async (req, res) => {
    try {
      const body = req.body as {
        q?: string;
        lat?: number;
        lon?: number;
        crops?: string[];
        areaHa?: number;
        refreshMarket?: boolean;
      };

      const rawCrops = Array.isArray(body.crops) ? body.crops : [];
      const crops: [CustomCropId, CustomCropId, CustomCropId, CustomCropId] = [
        parseCustomCrop(rawCrops[0] ?? 'tomatoes'),
        parseCustomCrop(rawCrops[1] ?? 'clover'),
        parseCustomCrop(rawCrops[2] ?? 'chickpeas'),
        parseCustomCrop(rawCrops[3] ?? 'wheat'),
      ];

      const resolved = await resolveLocation(
        body.q,
        typeof body.lat === 'number' && Number.isFinite(body.lat) ? body.lat : undefined,
        typeof body.lon === 'number' && Number.isFinite(body.lon) ? body.lon : undefined
      );
      const [nasaData, marketDataset] = await Promise.all([
        getNasaEnvironmentData(resolved),
        getCountryMarketDataset({
          countryCode: resolved.countryCode,
          countryName: resolved.countryName,
          locationName: resolved.name,
          forceRefresh: Boolean(body.refreshMarket),
        }),
      ]);

      const evaluation = evaluateCustomRotation({
        crops,
        telemetry: nasaData.telemetry,
        soil: nasaData.soil,
        location: nasaData.location,
      });

      const economics = estimateSandboxEconomics({
        crops,
        seasonStatuses: evaluation.seasonChecks.map((s) => ({
          seasonLabel: s.seasonLabel,
          status: s.status,
        })),
        survivalPct: evaluation.survivalPct,
        waterImpactPct: evaluation.waterImpactPct,
        areaHa: typeof body.areaHa === 'number' && body.areaHa > 0 ? body.areaHa : 10,
        dataset: marketDataset,
      });

      res.json({
        ...evaluation,
        marketDataset,
        economics,
      });
    } catch (err) {
      console.error('Evaluate custom rotation error:', err);
      res.status(500).json({ error: 'Unable to evaluate custom rotation' });
    }
  });

  // Live AI + NASA tailored farm tips, harvest countdown, watering schedule, preservation & survival risks
  app.post('/api/farm/ai-advice', async (req, res) => {
    try {
      const body = req.body as {
        farmData?: NasaFarmResponse;
        activeField?: FarmFieldPlot;
      };
      if (!body?.farmData) {
        res.status(400).json({ error: 'farmData is required' });
        return;
      }
      const advice = await generateFarmAiAdvice({
        farmData: body.farmData,
        activeField: body.activeField,
        userId: getAuthUserId(res),
      });
      res.json(advice);
    } catch (err) {
      console.error('AI farm advice error:', err);
      res.status(500).json({ error: 'Unable to generate AI farm advice' });
    }
  });

  app.get('/api/fields', (_req, res) => {
    res.json({ fields: listFields(getAuthUserId(res)) });
  });

  app.post('/api/fields', async (req, res) => {
    try {
      const { name, areaHa, locationQuery, anchorCrop, goal, plantedDate } = req.body as {
        name?: string;
        areaHa?: number;
        locationQuery?: string;
        anchorCrop?: string;
        goal?: string;
        plantedDate?: string;
      };
      if (!name || !name.trim()) {
        res.status(400).json({ error: 'Field name is required' });
        return;
      }
      const loc = await resolveLocation(locationQuery || name);
      const userId = getAuthUserId(res);
      const created = addFieldPlot(userId, {
        name,
        areaHa: Number(areaHa) || 40,
        locationQuery: loc.name,
        lat: loc.lat,
        lon: loc.lon,
        anchorCrop: parseCrop(anchorCrop),
        goal: parseGoal(goal),
        plantedDate: typeof plantedDate === 'string' && plantedDate.trim() ? plantedDate.trim() : undefined,
      });
      res.status(201).json({ field: created, fields: listFields(userId) });
    } catch (err) {
      console.error('Create field error:', err);
      res.status(500).json({ error: 'Failed to create farm plot' });
    }
  });

  app.patch('/api/fields/:id', async (req, res) => {
    try {
      const { name, areaHa, locationQuery, anchorCrop, goal, plantedDate } = req.body as {
        name?: string;
        areaHa?: number;
        locationQuery?: string;
        anchorCrop?: string;
        goal?: string;
        plantedDate?: string;
      };
      const updates: Parameters<typeof updateFieldPlot>[2] = {};
      if (typeof name === 'string' && name.trim()) updates.name = name;
      if (typeof areaHa === 'number' && Number.isFinite(areaHa)) updates.areaHa = areaHa;
      if (typeof anchorCrop === 'string') updates.anchorCrop = parseCrop(anchorCrop);
      if (typeof goal === 'string') updates.goal = parseGoal(goal);
      if (plantedDate !== undefined) updates.plantedDate = typeof plantedDate === 'string' ? plantedDate.trim() : '';
      if (typeof locationQuery === 'string' && locationQuery.trim()) {
        const loc = await resolveLocation(locationQuery);
        updates.locationQuery = loc.name;
        updates.lat = loc.lat;
        updates.lon = loc.lon;
      }

      const userId = getAuthUserId(res);
      const updated = updateFieldPlot(userId, req.params.id, updates);
      if (!updated) {
        res.status(404).json({ error: 'Farm plot not found' });
        return;
      }
      res.json({ field: updated, fields: listFields(userId) });
    } catch (err) {
      console.error('Update field error:', err);
      res.status(500).json({ error: 'Failed to update farm plot' });
    }
  });

  app.delete('/api/fields/:id', (req, res) => {
    const fields = removeFieldPlot(getAuthUserId(res), req.params.id);
    res.json({ fields });
  });

  app.get('/api/plans', (_req, res) => {
    res.json({ plans: listSavedPlans(getAuthUserId(res)) });
  });

  app.post('/api/plans', (req, res) => {
    try {
      const body = req.body as {
        locationName?: string;
        coordsLabel?: string;
        lat?: number;
        lon?: number;
        goal?: string;
        anchorCrop?: string;
        soilType?: string;
        soilPh?: number;
        waterSavingsPct?: number;
        plantingOrderSummary?: string;
        headlineTip?: string;
      };
      if (!body.locationName || !body.plantingOrderSummary) {
        res.status(400).json({ error: 'Missing required farm plan fields' });
        return;
      }
      const userId = getAuthUserId(res);
      const saved = saveFarmPlan(userId, {
        locationName: body.locationName,
        coordsLabel: body.coordsLabel || '',
        lat: Number(body.lat) || 0,
        lon: Number(body.lon) || 0,
        goal: parseGoal(body.goal),
        anchorCrop: parseCrop(body.anchorCrop),
        soilType: body.soilType || 'Loam',
        soilPh: Number(body.soilPh) || 7.0,
        waterSavingsPct: Number(body.waterSavingsPct) || 24,
        plantingOrderSummary: body.plantingOrderSummary,
        headlineTip: body.headlineTip || '',
      });
      res.status(201).json({ plan: saved, plans: listSavedPlans(userId) });
    } catch (err) {
      console.error('Save plan error:', err);
      res.status(500).json({ error: 'Failed to save farm plan' });
    }
  });

  app.delete('/api/plans/:id', (req, res) => {
    const plans = deleteSavedPlan(getAuthUserId(res), req.params.id);
    res.json({ plans });
  });

  app.get('/api/notes', (_req, res) => {
    res.json({ notes: listFarmNotes(getAuthUserId(res)) });
  });

  app.post('/api/notes', (req, res) => {
    const body = req.body as { text?: string };
    if (!body?.text || !body.text.trim()) {
      res.status(400).json({ error: 'Note text is required' });
      return;
    }
    const userId = getAuthUserId(res);
    const note = addFarmNote(userId, body.text);
    res.status(201).json({ note, notes: listFarmNotes(userId) });
  });

  app.delete('/api/notes/:id', (req, res) => {
    const notes = deleteFarmNote(getAuthUserId(res), req.params.id);
    res.json({ notes });
  });

  app.post('/api/chat', async (req, res) => {
    try {
      const payload = req.body as ChatRequestPayload;
      const result = await runTarsChat(payload, getAuthUserId(res));
      res.json(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to reach TARS AI right now.';
      console.error('TARS chat error:', message);
      res.status(500).json({ error: message });
    }
  });

  return app;
}
