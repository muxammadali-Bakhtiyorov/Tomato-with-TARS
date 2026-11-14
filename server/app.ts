import express from 'express';
import { buildAgronomicPlan, evaluateCustomRotation } from './agronomyEngine.ts';
import { runTarsChat, type ChatRequestPayload } from './geminiService.ts';
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

export function createApiApp() {
  const app = express();
  app.use(express.json());

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, service: 'Tomatoes with TARS NASA Almanac' });
  });

  app.get('/api/nasa/telemetry', async (req, res) => {
    try {
      const q = typeof req.query.q === 'string' ? req.query.q : undefined;
      const latRaw = typeof req.query.lat === 'string' ? Number(req.query.lat) : undefined;
      const lonRaw = typeof req.query.lon === 'string' ? Number(req.query.lon) : undefined;
      const goal = parseGoal(req.query.goal);
      const anchorCrop = parseCrop(req.query.crop);

      const resolved = await resolveLocation(
        q,
        Number.isFinite(latRaw) ? latRaw : undefined,
        Number.isFinite(lonRaw) ? lonRaw : undefined
      );

      const nasaData = await getNasaEnvironmentData(resolved);
      const agronomy = buildAgronomicPlan({
        location: nasaData.location,
        soil: nasaData.soil,
        telemetry: nasaData.telemetry,
        recentDaily: nasaData.recentDaily,
        forecastDaily: nasaData.forecastDaily,
        goal,
        anchorCrop,
      });

      const response: NasaFarmResponse = {
        location: nasaData.location,
        soil: nasaData.soil,
        goal,
        anchorCrop,
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

  // Evaluate a farmer's custom 4-season crop rotation plan against real NASA telemetry
  app.post('/api/rotations/evaluate', async (req, res) => {
    try {
      const body = req.body as {
        q?: string;
        lat?: number;
        lon?: number;
        crops?: string[];
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
      const nasaData = await getNasaEnvironmentData(resolved);

      const evaluation = evaluateCustomRotation({
        crops,
        telemetry: nasaData.telemetry,
        soil: nasaData.soil,
        location: nasaData.location,
      });

      res.json(evaluation);
    } catch (err) {
      console.error('Evaluate custom rotation error:', err);
      res.status(500).json({ error: 'Unable to evaluate custom rotation' });
    }
  });

  app.get('/api/fields', (_req, res) => {
    res.json({ fields: listFields() });
  });

  app.post('/api/fields', async (req, res) => {
    try {
      const { name, areaHa, locationQuery, anchorCrop, goal } = req.body as {
        name?: string;
        areaHa?: number;
        locationQuery?: string;
        anchorCrop?: string;
        goal?: string;
      };
      if (!name || !name.trim()) {
        res.status(400).json({ error: 'Field name is required' });
        return;
      }
      const loc = await resolveLocation(locationQuery || name);
      const created = addFieldPlot({
        name,
        areaHa: Number(areaHa) || 40,
        locationQuery: loc.name,
        lat: loc.lat,
        lon: loc.lon,
        anchorCrop: parseCrop(anchorCrop),
        goal: parseGoal(goal),
      });
      res.status(201).json({ field: created, fields: listFields() });
    } catch (err) {
      console.error('Create field error:', err);
      res.status(500).json({ error: 'Failed to create farm plot' });
    }
  });

  app.patch('/api/fields/:id', async (req, res) => {
    try {
      const { name, areaHa, locationQuery, anchorCrop, goal } = req.body as {
        name?: string;
        areaHa?: number;
        locationQuery?: string;
        anchorCrop?: string;
        goal?: string;
      };
      const updates: Parameters<typeof updateFieldPlot>[1] = {};
      if (typeof name === 'string' && name.trim()) updates.name = name;
      if (typeof areaHa === 'number' && Number.isFinite(areaHa)) updates.areaHa = areaHa;
      if (typeof anchorCrop === 'string') updates.anchorCrop = parseCrop(anchorCrop);
      if (typeof goal === 'string') updates.goal = parseGoal(goal);
      if (typeof locationQuery === 'string' && locationQuery.trim()) {
        const loc = await resolveLocation(locationQuery);
        updates.locationQuery = loc.name;
        updates.lat = loc.lat;
        updates.lon = loc.lon;
      }

      const updated = updateFieldPlot(req.params.id, updates);
      if (!updated) {
        res.status(404).json({ error: 'Farm plot not found' });
        return;
      }
      res.json({ field: updated, fields: listFields() });
    } catch (err) {
      console.error('Update field error:', err);
      res.status(500).json({ error: 'Failed to update farm plot' });
    }
  });

  app.delete('/api/fields/:id', (req, res) => {
    const fields = removeFieldPlot(req.params.id);
    res.json({ fields });
  });

  app.get('/api/plans', (_req, res) => {
    res.json({ plans: listSavedPlans() });
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
      const saved = saveFarmPlan({
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
      res.status(201).json({ plan: saved, plans: listSavedPlans() });
    } catch (err) {
      console.error('Save plan error:', err);
      res.status(500).json({ error: 'Failed to save farm plan' });
    }
  });

  app.delete('/api/plans/:id', (req, res) => {
    const plans = deleteSavedPlan(req.params.id);
    res.json({ plans });
  });

  app.get('/api/notes', (_req, res) => {
    res.json({ notes: listFarmNotes() });
  });

  app.post('/api/notes', (req, res) => {
    const body = req.body as { text?: string };
    if (!body?.text || !body.text.trim()) {
      res.status(400).json({ error: 'Note text is required' });
      return;
    }
    const note = addFarmNote(body.text);
    res.status(201).json({ note, notes: listFarmNotes() });
  });

  app.delete('/api/notes/:id', (req, res) => {
    const notes = deleteFarmNote(req.params.id);
    res.json({ notes });
  });

  app.post('/api/chat', async (req, res) => {
    try {
      const payload = req.body as ChatRequestPayload;
      const result = await runTarsChat(payload);
      res.json(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to reach TARS AI right now.';
      console.error('TARS chat error:', message);
      res.status(500).json({ error: message });
    }
  });

  return app;
}
