'use strict';

const path = require('path');
const fs = require('fs');
const express = require('express');
const cors = require('cors');
const swaggerUi = require('swagger-ui-express');
const yaml = require('js-yaml');

const {
  compileSource,
  executeSource,
  VirtualMachine,
  serializeValue,
  DEFAULT_MICROSTATES,
  MAX_MICROSTATES,
  clampMicrostateCount
} = require('./runtime/core');

const pkg = require('../package.json');

const app = express();
const API_PREFIX = '/api/v1';
const PORT = Number(process.env.PORT) || 7070;
const repoRoot = path.resolve(__dirname, '..', '..', '..');
const examplesDir = path.join(repoRoot, 'Examples');
const openapiPath = path.resolve(__dirname, '..', 'openapi', 'openapi.yaml');
const fsp = fs.promises;

app.use(cors());
app.use(express.json({ limit: '512kb' }));

const swaggerDoc = loadOpenApiDocument(openapiPath, process.env.SWAGGER_SERVER_URL);

if (swaggerDoc) {
  app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerDoc));
} else {
  app.get('/docs', (req, res) => {
    res.status(501).json({ error: 'OpenAPI document not generated yet.' });
  });
}

app.get('/openapi.json', (req, res) => {
  if (!swaggerDoc) {
    res.status(404).json({ error: 'OpenAPI document not generated yet.' });
    return;
  }
  res.json(swaggerDoc);
});

app.get(`${API_PREFIX}/health`, (req, res) => {
  res.json({
    status: 'ok',
    version: pkg.version,
    timestamp: new Date().toISOString(),
    defaults: {
      microstates: DEFAULT_MICROSTATES,
      maxMicrostates: MAX_MICROSTATES
    }
  });
});

app.post(`${API_PREFIX}/runtime/compile`, (req, res) => {
  try {
    const source = requireSource(req.body);
    const result = compileSource(source);
    res.json({ ...result, microstatesDefault: DEFAULT_MICROSTATES });
  } catch (err) {
    sendError(res, err, 400);
  }
});

app.post(`${API_PREFIX}/runtime/execute`, (req, res) => {
  try {
    const source = requireSource(req.body);
    const microstates = parseMicrostatesInput(req.body?.microstates);
    const reads = Array.isArray(req.body?.reads) ? req.body.reads : undefined;
    const result = executeSource(source, { microstates, reads });
    res.json(result);
  } catch (err) {
    sendError(res, err, 400);
  }
});

app.post(`${API_PREFIX}/runtime/read`, (req, res) => {
  try {
    const source = requireSource(req.body);
    const reads = req.body?.reads;
    if (!Array.isArray(reads) || !reads.length) {
      throw createBadRequest('Provide a non-empty "reads" array with { value, state } entries.');
    }
    const microstates = parseMicrostatesInput(req.body?.microstates);
    const result = executeSource(source, { microstates, reads });
    res.json({ reads: result.reads, bindings: result.bindings, microstates: result.microstates });
  } catch (err) {
    sendError(res, err, 400);
  }
});

app.get(`${API_PREFIX}/examples`, async (req, res) => {
  try {
    const items = await listExamples();
    res.json({ count: items.length, items });
  } catch (err) {
    sendError(res, err);
  }
});

app.get(`${API_PREFIX}/examples/:id`, async (req, res) => {
  try {
    const example = await readExample(req.params.id);
    if (!example) {
      res.status(404).json({ error: 'Example not found.' });
      return;
    }
    res.json(example);
  } catch (err) {
    sendError(res, err);
  }
});

registerKeywordEndpoints();
registerHelperEndpoints();

function requireSource(body) {
  if (!body || typeof body.source !== 'string' || !body.source.trim()) {
    throw createBadRequest('Request body must include a non-empty "source" string.');
  }
  return body.source;
}

function parseMicrostatesInput(value) {
  if (value === undefined || value === null) return undefined;
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    throw createBadRequest('microstates must be a finite number.');
  }
  return clampMicrostateCount(numeric);
}

function createBadRequest(message) {
  const error = new Error(message);
  error.statusCode = 400;
  return error;
}

function sendError(res, err, fallback = 500) {
  const status = err?.statusCode ?? (err?.code && err.code.startsWith('E') ? 500 : fallback);
  if (status >= 500) {
    console.error(err);
  }
  res.status(status).json({ error: err?.message ?? 'Unexpected error' });
}

function loadOpenApiDocument(filePath, overrideServerUrl) {
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    const doc = yaml.load(raw);
    if (doc && overrideServerUrl) {
      doc.servers = [
        {
          url: overrideServerUrl,
          description: 'Runtime base URL (overridden via SWAGGER_SERVER_URL)'
        }
      ];
    }
    return doc;
  } catch (err) {
    if (err.code !== 'ENOENT') {
      console.warn('Failed to load OpenAPI document:', err.message);
    }
    return null;
  }
}

async function listExamples() {
  try {
    const dirents = await fsp.readdir(examplesDir, { withFileTypes: true });
    const items = [];
    for (const dirent of dirents) {
      if (!dirent.isFile()) continue;
      if (!dirent.name.toLowerCase().endsWith('.unse')) continue;
      const id = dirent.name.replace(/\.unse$/i, '');
      const stats = await fsp.stat(path.join(examplesDir, dirent.name));
      items.push({ id, filename: dirent.name, size: stats.size });
    }
    return items.sort((a, b) => a.id.localeCompare(b.id));
  } catch (err) {
    if (err.code === 'ENOENT') return [];
    throw err;
  }
}

async function readExample(id) {
  const normalized = (id ?? '').toString().trim().toLowerCase();
  if (!normalized) return null;
  const items = await listExamples();
  const match = items.find((item) => item.id.toLowerCase() === normalized);
  if (!match) return null;
  const source = await fsp.readFile(path.join(examplesDir, match.filename), 'utf8');
  return { ...match, source };
}

function registerKeywordEndpoints() {
  const evaluators = {
    const: evaluateKeywordConst,
    lift1: evaluateKeywordLift1,
    lift2: evaluateKeywordLift2,
    D: evaluateKeywordD
  };

  Object.entries(evaluators).forEach(([keyword, evaluator]) => {
    app.post(`${API_PREFIX}/individual/keywords/${keyword}`, (req, res) => {
      try {
        const vm = createVm(req.body);
        const value = evaluator(vm, req.body ?? {});
        res.json(buildIndividualResponse({ keyword, vm, value }));
      } catch (err) {
        sendError(res, err, 400);
      }
    });
  });
}

function registerHelperEndpoints() {
  const helperArgBuilders = {
    uniform_state: () => [],
    psi_uniform: () => [],
    delta_state: (vm, body) => [parseScalarValueInput(body?.index, vm, 'index')],
    state: (vm, body) => [parseUValueInput(body?.value, vm, 'value')],
    state_from_mask: (vm, body) => [parseUValueInput(body?.mask, vm, 'mask')],
    state_range: (vm, body) => [
      parseScalarValueInput(body?.start, vm, 'start'),
      parseScalarValueInput(body?.end, vm, 'end')
    ],
    mask_range: (vm, body) => [
      parseScalarValueInput(body?.start, vm, 'start'),
      parseScalarValueInput(body?.end, vm, 'end')
    ],
    mask_threshold: (vm, body) => [
      parseUValueInput(body?.value, vm, 'value'),
      parseUValueInput(body?.threshold, vm, 'threshold')
    ],
    mask_lt: (vm, body) => [
      parseUValueInput(body?.left, vm, 'left'),
      parseUValueInput(body?.right, vm, 'right')
    ],
    mask_gt: (vm, body) => [
      parseUValueInput(body?.left, vm, 'left'),
      parseUValueInput(body?.right, vm, 'right')
    ],
    mask_eq: (vm, body) => [
      parseUValueInput(body?.left, vm, 'left'),
      parseUValueInput(body?.right, vm, 'right')
    ],
    collection: (vm, body) => {
      const items = Array.isArray(body?.items) ? body.items : [];
      if (!items.length) throw createBadRequest('items must include at least one UValue payload.');
      return items.map((item, index) => parseUValueInput(item, vm, `items[${index}]`));
    },
    inject: (vm, body) => {
      const args = [parseScalarOrUValueInput(body?.value, vm, 'value'), parseScalarValueInput(body?.index, vm, 'index')];
      if (body?.dimension !== undefined) {
        args.push(parseScalarValueInput(body.dimension, vm, 'dimension'));
      }
      return args;
    },
    CANCEL: (vm, body) => [
      parseUValueInput(body?.u, vm, 'u'),
      parseUValueInput(body?.v, vm, 'v')
    ],
    CANCEL_JOINT: (vm, body) => [
      parseUValueInput(body?.u, vm, 'u'),
      parseUValueInput(body?.v, vm, 'v')
    ],
    MIX: (vm, body) => [
      parseUValueInput(body?.u, vm, 'u'),
      parseUValueInput(body?.v, vm, 'v'),
      parseScalarValueInput(body?.alpha, vm, 'alpha')
    ],
    absU: (vm, body) => [parseUValueInput(body?.value, vm, 'value')],
    sqrtU: (vm, body) => [parseUValueInput(body?.value, vm, 'value')],
    negU: (vm, body) => [parseUValueInput(body?.value, vm, 'value')],
    normU: (vm, body) => [parseUValueInput(body?.value, vm, 'value')],
    addU: (vm, body) => [
      parseUValueInput(body?.left, vm, 'left'),
      parseUValueInput(body?.right, vm, 'right')
    ],
    subU: (vm, body) => [
      parseUValueInput(body?.left, vm, 'left'),
      parseUValueInput(body?.right, vm, 'right')
    ],
    mulU: (vm, body) => [
      parseUValueInput(body?.left, vm, 'left'),
      parseUValueInput(body?.right, vm, 'right')
    ],
    divU: (vm, body) => [
      parseUValueInput(body?.left, vm, 'left'),
      parseUValueInput(body?.right, vm, 'right')
    ],
    powU: (vm, body) => [
      parseUValueInput(body?.base, vm, 'base'),
      parseUValueInput(body?.exponent, vm, 'exponent')
    ]
  };

  Object.entries(helperArgBuilders).forEach(([name, buildArgs]) => {
    app.post(`${API_PREFIX}/individual/helpers/${name}`, (req, res) => {
      try {
        const vm = createVm(req.body);
        const args = buildArgs(vm, req.body ?? {});
        const value = vm.invokeHelper(name, args);
        if (!value) throw createBadRequest(`${name} helper did not produce a value.`);
        res.json(buildIndividualResponse({ helper: name, vm, value }));
      } catch (err) {
        sendError(res, err, 400);
      }
    });
  });
}

function evaluateKeywordConst(vm, body) {
  const scalar = parseScalarValueInput(body?.value, vm, 'value');
  const { real, imag } = scalar.data;
  const arr = Array.from({ length: vm.M }, () => ({ real, imag }));
  const ref = vm.allocateUValue(arr);
  return { kind: 'uvalue', ref };
}

function evaluateKeywordLift1(vm, body) {
  const operator = ensureString(body?.operator, 'operator');
  const argument = parseUValueInput(body?.argument, vm, 'argument');
  return vm.applyUnaryLiftHelper(operator, argument, 'lift1');
}

function evaluateKeywordLift2(vm, body) {
  const operator = ensureString(body?.operator, 'operator');
  const left = parseUValueInput(body?.left, vm, 'left');
  const right = parseUValueInput(body?.right, vm, 'right');
  return vm.applyBinaryLiftHelper(operator, left, right, 'lift2');
}

function evaluateKeywordD(vm, body) {
  const rawDimension = body?.dimension;
  let dimension = null;
  if (rawDimension !== undefined && rawDimension !== null) {
    const numeric = Number(rawDimension);
    if (!Number.isFinite(numeric)) throw createBadRequest('dimension must be a finite number.');
    dimension = numeric;
  }
  const stateValue = parseStateLikeInput(body?.state, vm, 'state');
  return vm.applyDTransform(stateValue, dimension);
}

function buildIndividualResponse({ keyword, helper, vm, value }) {
  if (!value) throw createBadRequest('Evaluation produced no value.');
  const payload = {
    microstates: vm.M,
    result: serializeValue(vm, value)
  };
  if (keyword) payload.keyword = keyword;
  if (helper) payload.helper = helper;
  return payload;
}

function createVm(body) {
  const microstates = parseMicrostatesInput(body?.microstates);
  return new VirtualMachine({ microstates });
}

function ensureString(value, label) {
  if (typeof value !== 'string' || !value.trim()) {
    throw createBadRequest(`${label} must be a non-empty string.`);
  }
  return value.trim();
}

function parseScalarValueInput(payload, vm, label) {
  if (!payload || typeof payload !== 'object' || payload.kind !== 'scalar') {
    throw createBadRequest(`${label} must be a scalar payload with kind="scalar".`);
  }
  const real = Number(payload.real ?? 0);
  const imag = Number(payload.imag ?? 0);
  if (!Number.isFinite(real) || !Number.isFinite(imag)) {
    throw createBadRequest(`${label} real/imag components must be finite numbers.`);
  }
  return vm.makeScalarValue(real, imag);
}

function parseUValueInput(payload, vm, label) {
  if (!payload || typeof payload !== 'object' || payload.kind !== 'uvalue') {
    throw createBadRequest(`${label} must be a UValue payload with kind="uvalue".`);
  }
  const samples = Array.isArray(payload.samples) ? payload.samples : [];
  const dimension = payload.dimension === undefined ? 0 : parseDimension(payload.dimension, `${label}.dimension`);
  const required = Math.max(samples.length, dimension, 1);
  if (required > vm.M) vm.ensureMicrostates(required);
  const arr = new Array(vm.M);
  for (let i = 0; i < vm.M; i += 1) {
    const sample = samples[i] ?? { real: 0, imag: 0 };
    const real = Number(sample.real ?? 0);
    const imag = Number(sample.imag ?? 0);
    if (!Number.isFinite(real) || !Number.isFinite(imag)) {
      throw createBadRequest(`${label} samples must contain finite numbers.`);
    }
    const data = vm.makeScalarValue(real, imag).data;
    arr[i] = { real: data.real, imag: data.imag };
  }
  const ref = vm.allocateUValue(arr);
  return { kind: 'uvalue', ref };
}

function parseUStateInput(payload, vm, label) {
  if (!payload || typeof payload !== 'object' || payload.kind !== 'ustate') {
    throw createBadRequest(`${label} must be a UState payload with kind="ustate".`);
  }
  const amplitudes = Array.isArray(payload.amplitudes) ? payload.amplitudes : [];
  const dimension = payload.dimension === undefined ? 0 : parseDimension(payload.dimension, `${label}.dimension`);
  const required = Math.max(amplitudes.length, dimension, 1);
  if (required > vm.M) vm.ensureMicrostates(required);
  const arr = new Array(vm.M);
  for (let i = 0; i < vm.M; i += 1) {
    const amp = amplitudes[i] ?? { real: 0, imag: 0 };
    const real = Number(amp.real ?? 0);
    const imag = Number(amp.imag ?? 0);
    if (!Number.isFinite(real) || !Number.isFinite(imag)) {
      throw createBadRequest(`${label} amplitudes must contain finite numbers.`);
    }
    const data = vm.makeScalarValue(real, imag).data;
    arr[i] = { real: data.real, imag: data.imag };
  }
  const ref = vm.allocateUState(arr);
  vm.normalizeState(ref);
  return { kind: 'ustate', ref };
}

function parseScalarOrUValueInput(payload, vm, label) {
  if (!payload || typeof payload !== 'object' || !payload.kind) {
    throw createBadRequest(`${label} must specify kind (scalar or uvalue).`);
  }
  if (payload.kind === 'scalar') return parseScalarValueInput(payload, vm, label);
  if (payload.kind === 'uvalue') return parseUValueInput(payload, vm, label);
  throw createBadRequest(`${label} kind must be 'scalar' or 'uvalue'.`);
}

function parseStateLikeInput(payload, vm, label) {
  if (!payload || typeof payload !== 'object' || !payload.kind) {
    throw createBadRequest(`${label} must include kind (ustate or uvalue).`);
  }
  if (payload.kind === 'ustate') return parseUStateInput(payload, vm, label);
  if (payload.kind === 'uvalue') return vm.resolveStateValue(parseUValueInput(payload, vm, label));
  throw createBadRequest(`${label} kind must be 'ustate' or 'uvalue'.`);
}

function parseDimension(value, label) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    throw createBadRequest(`${label} must be a finite number.`);
  }
  return clampMicrostateCount(Math.floor(numeric));
}

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`UNS runtime API listening on http://localhost:${PORT}`);
  });
}

module.exports = { app };
