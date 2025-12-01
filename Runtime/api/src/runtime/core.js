'use strict';

const SCALE = 65536;
const DEFAULT_MICROSTATES = 512;
const MAX_MICROSTATES = 32768;

const KEYWORDS = new Set(['let', 'state', 'const', 'read', 'lift1', 'lift2', 'D', 'true', 'false']);
const RESERVED = new Set(['novel', 'uvalue', 'ustate', 'scalar', 'fn', 'type']);

const HELPER_SPECS = {
  uniform_state: { returnType: 'ustate', required: [], optional: [] },
  psi_uniform: { returnType: 'ustate', required: [], optional: [] },
  delta_state: { returnType: 'ustate', required: ['scalar'], optional: [] },
  state: { returnType: 'ustate', required: ['uvalue'], optional: [] },
  state_from_mask: { returnType: 'ustate', required: ['uvalue'], optional: [] },
  state_range: { returnType: 'ustate', required: ['scalar', 'scalar'], optional: [] },
  mask_range: { returnType: 'uvalue', required: ['scalar', 'scalar'], optional: [] },
  mask_threshold: { returnType: 'uvalue', required: ['uvalue', 'uvalue'], optional: [] },
  mask_lt: { returnType: 'uvalue', required: ['uvalue', 'uvalue'], optional: [] },
  mask_gt: { returnType: 'uvalue', required: ['uvalue', 'uvalue'], optional: [] },
  mask_eq: { returnType: 'uvalue', required: ['uvalue', 'uvalue'], optional: [] },
  NORM: { returnType: 'uvalue', required: ['uvalue'], optional: [] },
  MERGE: { returnType: 'uvalue', required: ['tuple'], optional: ['tuple'] },
  MASK: { returnType: 'uvalue', required: ['uvalue', 'uvalue'], optional: [] },
  PROJECT: { returnType: 'uvalue', required: ['uvalue', 'tuple'], optional: [] },
  OVERLAP: { returnType: 'uvalue', required: ['uvalue', 'uvalue'], optional: [] },
  DOT: { returnType: 'scalar', required: ['uvalue', 'uvalue'], optional: [] },
  DIST_L1: { returnType: 'scalar', required: ['uvalue', 'uvalue'], optional: [] },
  collection: { returnType: 'uvalue', required: [], optional: [], variadicType: 'uvalue' },
  inject: { returnType: 'uvalue', required: ['scalarOrUValue', 'scalar'], optional: ['scalar'] },
  CANCEL: { returnTuple: ['uvalue', 'uvalue'], required: ['uvalue', 'uvalue'], optional: [] },
  CANCEL_JOINT: { returnType: 'uvalue', required: ['uvalue', 'uvalue'], optional: [] },
  MIX: { returnType: 'uvalue', required: ['uvalue', 'uvalue', 'scalar'], optional: [] },
  invokeDKeyword: { returnType: 'ustate', required: ['scalar', 'stateLike'], optional: [] },
  meanU: { returnType: 'scalar', required: ['uvalue'], optional: ['stateLike'] },
  sumU: { returnType: 'scalar', required: ['uvalue'], optional: ['stateLike'] },
  integralU: { returnType: 'scalar', required: ['uvalue'], optional: ['stateLike'] },
  varianceU: { returnType: 'scalar', required: ['uvalue'], optional: ['stateLike'] },
  variance: { returnType: 'scalar', required: ['uvalue', 'stateLike'], optional: [] },
  stddevU: { returnType: 'scalar', required: ['uvalue'], optional: ['stateLike'] },
  stdU: { returnType: 'scalar', required: ['uvalue'], optional: ['stateLike'] },
  densityU: { returnType: 'scalar', required: ['uvalue'], optional: ['stateLike'] },
  integrate: { returnType: 'scalar', required: ['uvalue', 'stateLike'], optional: [] },
  mean: { returnType: 'scalar', required: ['uvalue'], optional: [] },
  smoothness: { returnType: 'scalar', required: ['uvalue'], optional: [] },
  absU: { returnType: 'uvalue', required: ['uvalue'], optional: [] },
  negU: { returnType: 'uvalue', required: ['uvalue'], optional: [] },
  sqrtU: { returnType: 'uvalue', required: ['uvalue'], optional: [] },
  normU: { returnType: 'uvalue', required: ['uvalue'], optional: [] },
  addU: { returnType: 'uvalue', required: ['uvalue', 'uvalue'], optional: [] },
  subU: { returnType: 'uvalue', required: ['uvalue', 'uvalue'], optional: [] },
  mulU: { returnType: 'uvalue', required: ['uvalue', 'uvalue'], optional: [] },
  divU: { returnType: 'uvalue', required: ['uvalue', 'uvalue'], optional: [] },
  powU: { returnType: 'uvalue', required: ['uvalue', 'uvalue'], optional: [] },
  printU: { returnType: 'void', required: ['uvalue'], optional: [] },
  plotU: { returnType: 'void', required: ['uvalue'], optional: [] }
};
const EXPLICIT_HELPER_ALIASES = {
  helperUniformState: 'uniform_state',
  helperPsiUniform: 'psi_uniform',
  helperDeltaState: 'delta_state',
  helperState: 'state',
  helperStateFromMask: 'state_from_mask',
  helperStateRange: 'state_range',
  helperMaskRange: 'mask_range',
  helperMaskThreshold: 'mask_threshold',
  helperMaskLessThan: 'mask_lt',
  helperMaskGreaterThan: 'mask_gt',
  helperMaskEqual: 'mask_eq',
  helperNorm: 'NORM',
  helperMerge: 'MERGE',
  helperMaskSimplex: 'MASK',
  helperProject: 'PROJECT',
  helperOverlap: 'OVERLAP',
  helperDot: 'DOT',
  helperDistL1: 'DIST_L1',
  helperCollection: 'collection',
  helperInject: 'inject',
  helperCancel: 'CANCEL',
  helperCancelJoint: 'CANCEL_JOINT',
  helperMix: 'MIX'
};
const HELPER_ALIAS_LOOKUP = buildHelperAliasLookup(Object.keys(HELPER_SPECS), EXPLICIT_HELPER_ALIASES);
const HELPER_ALIAS_TUPLE_SPREAD = new Map([
  ['helpermerge', { canonical: 'MERGE', tupleIndex: 0 }],
  ['helperproject', { canonical: 'PROJECT', tupleIndex: 1 }]
]);

const PRECEDENCE = { '+u': 1, '*u': 2, '*s': 2 };

const tupleType = (elements) => ({ kind: 'tuple', elements: Array.isArray(elements) ? [...elements] : [] });
const isTupleType = (value) => Boolean(value && typeof value === 'object' && value.kind === 'tuple');

function toPascalCase(value) {
  if (!value) return '';
  return value
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join('');
}

function buildHelperAliasLookup(names, explicitAliases = {}) {
  const map = new Map();
  const register = (alias, canonical) => {
    if (!alias || !canonical) return;
    map.set(alias.toLowerCase(), canonical);
  };
  names.forEach((name) => {
    register(name, name);
    register(`helper${toPascalCase(name)}`, name);
    register(`helper_${name}`, name);
    register(`helper${name}`, name);
    register(name.replace(/[^A-Za-z0-9]/g, ''), name);
  });
  Object.entries(explicitAliases).forEach(([alias, canonical]) => register(alias, canonical));
  return map;
}

function canonicalHelperName(name) {
  if (typeof name !== 'string') return null;
  return HELPER_ALIAS_LOOKUP.get(name.toLowerCase()) ?? null;
}

function reshapeHelperArgs(canonicalName, rawName, args) {
  if (!rawName) return args;
  const config = HELPER_ALIAS_TUPLE_SPREAD.get(rawName.toLowerCase());
  if (!config) return args;
  if (config.canonical && config.canonical !== canonicalName) return args;
  const index = Math.max(0, config.tupleIndex ?? 0);
  if (index >= args.length) return args;
  const prefix = args.slice(0, index);
  const elements = args.slice(index);
  if (!elements.length) return args;
  const tupleLiteral = { type: 'TupleLiteral', elements };
  return [...prefix, tupleLiteral];
}

function describeTypeName(value) {
  if (typeof value === 'string') return value;
  if (isTupleType(value)) {
    const count = value.elements?.length;
    const size = Number.isFinite(count) ? count : '?';
    return `tuple(${size})`;
  }
  if (!value) return 'void';
  return 'unknown';
}

function clampMicrostateCount(value) {
  if (!Number.isFinite(value)) return DEFAULT_MICROSTATES;
  const clamped = Math.min(MAX_MICROSTATES, Math.max(1, Math.floor(value)));
  return clamped;
}

function clampUnitInterval(value) {
  if (!Number.isFinite(value)) return 0;
  if (value <= 0) return 0;
  if (value >= 1) return 1;
  return value;
}

function encodeReal(v) {
  return Math.round(v * SCALE);
}

function decodeReal(word) {
  return word / SCALE;
}

function clampWord(word) {
  if (!Number.isFinite(word)) return 0;
  if (word > 2147483647) return 2147483647;
  if (word < -2147483648) return -2147483648;
  return word | 0;
}

function addQ16(a, b) {
  return clampWord(a + b);
}

function subQ16(a, b) {
  return clampWord(a - b);
}

function mulQ16(a, b) {
  const prod = Math.trunc((a * b) / SCALE);
  return clampWord(prod);
}

function complex(real, imag = 0) {
  return { real: encodeReal(real), imag: encodeReal(imag) };
}

function cloneComplex(c) {
  return { real: c.real | 0, imag: c.imag | 0, novelId: c.novelId };
}

function complexAdd(a, b) {
  if (a.novelId) return cloneComplex(a);
  if (b.novelId) return cloneComplex(b);
  return { real: addQ16(a.real, b.real), imag: addQ16(a.imag, b.imag) };
}

function complexMul(a, b) {
  if (a.novelId) return cloneComplex(a);
  if (b.novelId) return cloneComplex(b);
  const real = subQ16(mulQ16(a.real, b.real), mulQ16(a.imag, b.imag));
  const imag = addQ16(mulQ16(a.real, b.imag), mulQ16(a.imag, b.real));
  return { real, imag };
}

function complexScale(s, v) {
  if (s.novelId) return cloneComplex(s);
  if (v.novelId) return cloneComplex(v);
  return complexMul(s, v);
}

function magnitudeSquared(c) {
  if (c.novelId) return 0;
  const realSq = mulQ16(c.real, c.real);
  const imagSq = mulQ16(c.imag, c.imag);
  return addQ16(realSq, imagSq);
}

function floatToComplex(re, im = 0) {
  return { real: encodeReal(re), imag: encodeReal(im) };
}

function complexToFloat(c) {
  return { re: decodeReal(c.real), im: decodeReal(c.imag) };
}

function toInt(word) {
  return Math.trunc(decodeReal(word));
}

function isPrimeInt(n) {
  if (n <= 1) return false;
  if (n <= 3) return true;
  if (n % 2 === 0 || n % 3 === 0) return false;
  for (let i = 5; i * i <= n; i += 6) {
    if (n % i === 0 || n % (i + 2) === 0) return false;
  }
  return true;
}

const UNSOperators = (() => {
  const EPS = 1e-12;
  const SUM_TOLERANCE = 1e-9;

  const toArray = (vector, label = 'vector') => {
    if (Array.isArray(vector)) return vector.map(Number);
    if (ArrayBuffer.isView(vector)) return Array.from(vector, Number);
    throw new Error(`Expected array-like for ${label}`);
  };

  const ensureSameLength = (a, b, labelA = 'a', labelB = 'b') => {
    if (a.length !== b.length) {
      throw new Error(`${labelA} and ${labelB} must have equal length`);
    }
  };

  const assertNonNegative = (vec, label) => {
    if (vec.some((v) => v < -EPS)) {
      throw new Error(`${label} must be nonnegative`);
    }
  };

  const sum = (vec) => vec.reduce((acc, v) => acc + v, 0);

  const uniform = (dim) => {
    if (dim <= 0) throw new Error('Dimension must be positive');
    const value = 1 / dim;
    return Array(dim).fill(value);
  };

  const clampAlpha = (alpha) => {
    if (!Number.isFinite(alpha)) return 0;
    return Math.min(1, Math.max(0, alpha));
  };

  const normalize = (vector) => {
    const arr = toArray(vector, 'NORM input');
    assertNonNegative(arr, 'NORM input');
    const s = sum(arr);
    if (Math.abs(s) < SUM_TOLERANCE) {
      return uniform(arr.length || 1);
    }
    return arr.map((v) => v / s);
  };

  const mix = (u, v, alpha = 0.5) => {
    const left = normalize(u);
    const right = normalize(v);
    ensureSameLength(left, right, 'u', 'v');
    const a = clampAlpha(alpha);
    const b = 1 - a;
    return left.map((value, idx) => a * value + b * right[idx]);
  };

  const merge = (vectors, weights) => {
    const list = (vectors || []).map((vec, idx) => toArray(vec, `vectors[${idx}]`));
    if (!list.length) throw new Error('MERGE requires at least one vector');
    const dim = list[0].length;
    list.forEach((vec, idx) => {
      if (vec.length !== dim) throw new Error(`vectors[${idx}] length mismatch`);
      assertNonNegative(vec, `vectors[${idx}]`);
    });
    const normalized = list.map((vec) => normalize(vec));
    const resolvedWeights = Array.isArray(weights) ? weights.map(Number) : normalized.map(() => 1);
    if (resolvedWeights.length !== normalized.length) {
      throw new Error('weights length must match vectors length');
    }
    const totalWeight = sum(resolvedWeights);
    const safeWeights = totalWeight > EPS ? resolvedWeights.map((w) => w / totalWeight) : resolvedWeights.map(() => 1 / resolvedWeights.length);
    const acc = Array(dim).fill(0);
    normalized.forEach((vec, idx) => {
      const w = safeWeights[idx];
      vec.forEach((value, j) => {
        acc[j] += value * w;
      });
    });
    return normalize(acc);
  };

  const split = (vector, coefficients) => {
    const base = normalize(vector);
    const coeffs = toArray(coefficients, 'coefficients');
    if (!coeffs.length) throw new Error('coefficients must contain at least one value');
    assertNonNegative(coeffs, 'coefficients');
    const coeffSum = sum(coeffs);
    if (Math.abs(coeffSum - 1) > SUM_TOLERANCE) {
      throw new Error('coefficients must sum to 1');
    }
    return coeffs.map((alpha) => base.map((value) => value * alpha));
  };

  const overlap = (u, v) => {
    const left = normalize(u);
    const right = normalize(v);
    ensureSameLength(left, right, 'u', 'v');
    return left.map((value, idx) => Math.min(value, right[idx]));
  };

  const cancel = (u, v) => {
    const left = normalize(u);
    const right = normalize(v);
    ensureSameLength(left, right, 'u', 'v');
    const ov = overlap(left, right);
    const residualU = left.map((value, idx) => Math.max(0, value - ov[idx]));
    const residualV = right.map((value, idx) => Math.max(0, value - ov[idx]));
    return [normalize(residualU), normalize(residualV)];
  };

  const cancelJoint = (u, v) => {
    const [resU, resV] = cancel(u, v);
    return normalize(resU.map((value, idx) => value + resV[idx]));
  };

  const mask = (vector, maskVector) => {
    const base = normalize(vector);
    const maskArr = toArray(maskVector, 'mask');
    ensureSameLength(base, maskArr, 'vector', 'mask');
    assertNonNegative(maskArr, 'mask');
    const applied = base.map((value, idx) => value * maskArr[idx]);
    return normalize(applied);
  };

  const project = (vector, subset) => {
    const maskArr = Array.isArray(subset)
      ? maskVectorForSubset(vector, subset)
      : toArray(subset, 'subset');
    return mask(vector, maskArr);
  };

  const maskVectorForSubset = (vector, subset) => {
    const dim = Array.isArray(vector) ? vector.length : toArray(vector).length;
    const maskArray = Array(dim).fill(0);
    subset.forEach((idxRaw) => {
      const idx = Math.trunc(idxRaw);
      if (idx >= 0 && idx < dim) maskArray[idx] = 1;
    });
    return maskArray;
  };

  const dot = (u, v) => {
    const left = normalize(u);
    const right = normalize(v);
    ensureSameLength(left, right, 'u', 'v');
    const value = left.reduce((acc, entry, idx) => acc + entry * right[idx], 0);
    return Math.min(1, Math.max(0, value));
  };

  const distL1 = (u, v) => {
    const left = normalize(u);
    const right = normalize(v);
    ensureSameLength(left, right, 'u', 'v');
    const total = left.reduce((acc, entry, idx) => acc + Math.abs(entry - right[idx]), 0);
    return Math.min(1, Math.max(0, 0.5 * total));
  };

  const runSelfTests = () => {
    const report = [];
    report.push({ name: 'NORM', result: Math.abs(sum(normalize([0.2, 0.2, 0.6])) - 1) < 1e-9 });
    report.push({ name: 'MIX', result: Math.abs(sum(mix([1, 0], [0, 1], 0.25)) - 1) < 1e-9 });
    report.push({ name: 'MERGE', result: Math.abs(sum(merge([[1, 0], [0, 1]], [2, 1])) - 1) < 1e-9 });
    report.push({ name: 'CANCEL symmetry', result: (() => {
      const [a, b] = cancel([0.7, 0.3], [0.4, 0.6]);
      const [b2, a2] = cancel([0.4, 0.6], [0.7, 0.3]);
      return JSON.stringify(a) === JSON.stringify(a2) && JSON.stringify(b) === JSON.stringify(b2);
    })() });
    return report;
  };

  return {
    EPS,
    NORM: normalize,
    MIX: mix,
    MERGE: merge,
    SPLIT: split,
    CANCEL: cancel,
    CANCEL_JOINT: cancelJoint,
    MASK: mask,
    PROJECT: project,
    OVERLAP: overlap,
    DOT: dot,
    DIST_L1: distL1,
    runSelfTests
  };
})();

const UnaryLibrary = {
  identity: (c) => cloneComplex(c),
  sqrt: (c, index, tracker) => {
    if (c.novelId) return cloneComplex(c);
    if (c.imag !== 0) {
      const id = tracker.record('sqrt', [complexToFloat(c)], index);
      return { real: 0, imag: 0, novelId: id };
    }
    const value = Math.sqrt(Math.max(0, decodeReal(c.real)));
    return { real: encodeReal(value), imag: 0 };
  },
  sin: (c, index, tracker) => {
    if (c.novelId) return cloneComplex(c);
    if (c.imag !== 0) {
      const id = tracker.record('sin', [complexToFloat(c)], index);
      return { real: 0, imag: 0, novelId: id };
    }
    const value = Math.sin(decodeReal(c.real));
    return { real: encodeReal(value), imag: 0 };
  },
  cos: (c, index, tracker) => {
    if (c.novelId) return cloneComplex(c);
    if (c.imag !== 0) {
      const id = tracker.record('cos', [complexToFloat(c)], index);
      return { real: 0, imag: 0, novelId: id };
    }
    const value = Math.cos(decodeReal(c.real));
    return { real: encodeReal(value), imag: 0 };
  },
  log: (c, index, tracker) => {
    if (c.novelId) return cloneComplex(c);
    if (c.imag !== 0 || c.real <= 0) {
      const id = tracker.record('log', [complexToFloat(c)], index);
      return { real: 0, imag: 0, novelId: id };
    }
    const value = Math.log(decodeReal(c.real));
    return { real: encodeReal(value), imag: 0 };
  },
  conj: (c) => ({ real: c.real, imag: -c.imag, novelId: c.novelId }),
  index: (c, i) => ({ real: encodeReal(i), imag: 0 }),
  isPrime: (c) => {
    if (c.novelId) return cloneComplex(c);
    const n = toInt(c.real);
    const value = isPrimeInt(Math.abs(n)) ? 1 : 0;
    return { real: encodeReal(value), imag: 0 };
  },
  abs: (c) => {
    if (c.novelId) return cloneComplex(c);
    const magnitude = Math.sqrt(Math.max(0, decodeReal(magnitudeSquared(c))));
    return { real: encodeReal(magnitude), imag: 0 };
  },
  norm: (c) => {
    if (c.novelId) return cloneComplex(c);
    const magnitude = Math.sqrt(Math.max(0, decodeReal(magnitudeSquared(c))));
    return { real: encodeReal(magnitude), imag: 0 };
  }
};

const UnaryCache = new Map();

function resolveUnaryFunction(name) {
  if (UnaryCache.has(name)) return UnaryCache.get(name);
  if (UnaryLibrary[name]) {
    UnaryCache.set(name, UnaryLibrary[name]);
    return UnaryLibrary[name];
  }
  const windowMatch = /^windowWeight_(-?\d+(?:\.\d+)?)_(-?\d+(?:\.\d+)?)$/i.exec(name);
  if (windowMatch) {
    const center = parseFloat(windowMatch[1]);
    const width = Math.abs(parseFloat(windowMatch[2]));
    const fn = (c, index) => {
      const half = width / 2;
      const weight = Math.abs(index - center) <= half ? 1 : 0;
      return { real: encodeReal(weight), imag: 0 };
    };
    UnaryCache.set(name, fn);
    return fn;
  }
  return null;
}

const BinaryLibrary = {
  divide: (a, b, index, tracker) => {
    if (a.novelId) return cloneComplex(a);
    if (b.novelId) return cloneComplex(b);
    const denom = decodeReal(magnitudeSquared(b));
    if (Math.abs(denom) < 1e-6) {
      const id = tracker.record('divide', [complexToFloat(a), complexToFloat(b)], index);
      return { real: 0, imag: 0, novelId: id };
    }
    const af = complexToFloat(a);
    const bf = complexToFloat(b);
    const real = (af.re * bf.re + af.im * bf.im) / denom;
    const imag = (af.im * bf.re - af.re * bf.im) / denom;
    return floatToComplex(real, imag);
  },
  pow: (a, b, index, tracker) => {
    if (a.novelId || b.novelId) return cloneComplex(a.novelId ? a : b);
    if (a.imag !== 0 || b.imag !== 0) {
      const id = tracker.record('pow', [complexToFloat(a), complexToFloat(b)], index);
      return { real: 0, imag: 0, novelId: id };
    }
    const value = Math.pow(decodeReal(a.real), decodeReal(b.real));
    return { real: encodeReal(value), imag: 0 };
  },
  blend: (a, b) => {
    if (a.novelId) return cloneComplex(a);
    if (b.novelId) return cloneComplex(b);
    const real = encodeReal((decodeReal(a.real) + decodeReal(b.real)) / 2);
    const imag = encodeReal((decodeReal(a.imag) + decodeReal(b.imag)) / 2);
    return { real, imag };
  },
  lt: (a, b) => {
    if (a.novelId) return cloneComplex(a);
    if (b.novelId) return cloneComplex(b);
    const result = decodeReal(a.real) < decodeReal(b.real) ? 1 : 0;
    return { real: encodeReal(result), imag: 0 };
  },
  gt: (a, b) => {
    if (a.novelId) return cloneComplex(a);
    if (b.novelId) return cloneComplex(b);
    const result = decodeReal(a.real) > decodeReal(b.real) ? 1 : 0;
    return { real: encodeReal(result), imag: 0 };
  },
  ge: (a, b) => {
    if (a.novelId) return cloneComplex(a);
    if (b.novelId) return cloneComplex(b);
    const result = decodeReal(a.real) >= decodeReal(b.real) ? 1 : 0;
    return { real: encodeReal(result), imag: 0 };
  },
  le: (a, b) => {
    if (a.novelId) return cloneComplex(a);
    if (b.novelId) return cloneComplex(b);
    const result = decodeReal(a.real) <= decodeReal(b.real) ? 1 : 0;
    return { real: encodeReal(result), imag: 0 };
  },
  eq: (a, b) => {
    if (a.novelId) return cloneComplex(a);
    if (b.novelId) return cloneComplex(b);
    const af = complexToFloat(a);
    const bf = complexToFloat(b);
    const result = af.re === bf.re && af.im === bf.im ? 1 : 0;
    return { real: encodeReal(result), imag: 0 };
  }
};

function tokenize(source) {
  const tokens = [];
  let i = 0;
  let line = 1;
  let column = 1;

  const advance = () => {
    const ch = source[i++];
    if (ch === '\n') {
      line += 1;
      column = 1;
    } else {
      column += 1;
    }
    return ch;
  };

  const peek = (offset = 0) => source[i + offset] ?? '';

  const emit = (type, value) => {
    tokens.push({ type, value, line, column });
  };

  while (i < source.length) {
    let ch = peek();

    if (/\s/.test(ch)) {
      advance();
      continue;
    }

    if (ch === '/' && peek(1) === '/') {
      while (i < source.length && advance() !== '\n') {}
      continue;
    }

    if (ch === '/' && peek(1) === '*') {
      advance();
      advance();
      while (i < source.length && !(peek() === '*' && peek(1) === '/')) {
        advance();
      }
      advance();
      advance();
      continue;
    }

    if (ch === '/') {
      throw new Error('Use lift2(divide, ...) or frac(a, b) for division');
    }

    const identTail = (offset) => source[i + offset] ?? '';
    const isIdentChar = (char) => /[A-Za-z0-9_]/.test(char);

    if (source.startsWith('NaN', i) && !isIdentChar(identTail(3))) {
      advance();
      advance();
      advance();
      emit('number', { re: NaN, im: 0 });
      continue;
    }

    if (source.startsWith('-Infinity', i) && !isIdentChar(identTail(9))) {
      for (let k = 0; k < 9; k += 1) advance();
      emit('number', { re: -Infinity, im: 0 });
      continue;
    }

    if (source.startsWith('Infinity', i) && !isIdentChar(identTail(8))) {
      for (let k = 0; k < 8; k += 1) advance();
      emit('number', { re: Infinity, im: 0 });
      continue;
    }

    const two = source.slice(i, i + 2);
    if (['+u', '*u', '*s'].includes(two)) {
      emit('operator', two);
      advance();
      advance();
      continue;
    }

    if (ch === '=') {
      emit('operator', ch);
      advance();
      continue;
    }

    if ('|,(){}:'.includes(ch)) {
      emit('punct', ch);
      advance();
      continue;
    }

    if ((ch === '-' && /[0-9]/.test(peek(1))) || /[0-9]/.test(ch)) {
      let literal = '';
      literal += advance();
      while (/[0-9]/.test(peek())) literal += advance();
      if (peek() === '.' && /[0-9]/.test(peek(1))) {
        literal += advance();
        while (/[0-9]/.test(peek())) literal += advance();
      }
      let realPart = parseFloat(literal);
      let imagPart = 0;
      const rest = source.slice(i);
      const complexMatch = rest.match(/^([+-])(?!u)(\d+(?:\.\d+)?)(i)/);
      if (complexMatch) {
        const consumed = complexMatch[0].length;
        for (let k = 0; k < consumed; k += 1) advance();
        imagPart = parseFloat(`${complexMatch[1]}${complexMatch[2]}`);
      } else if (rest.startsWith('i')) {
        advance();
        imagPart = realPart;
        realPart = 0;
      }
      emit('number', { re: realPart, im: imagPart });
      continue;
    }

    if (/[A-Za-z_]/.test(ch)) {
      let ident = '';
      do {
        ident += advance();
        ch = peek();
      } while (/[A-Za-z0-9_]/.test(ch));
      if (KEYWORDS.has(ident)) {
        emit('keyword', ident);
      } else if (RESERVED.has(ident)) {
        emit('reserved', ident);
      } else {
        emit('identifier', ident);
      }
      continue;
    }

    throw new Error(`Unexpected character '${ch}' at ${line}:${column}`);
  }

  tokens.push({ type: 'eof', line, column });
  return tokens;
}

class Parser {
  constructor(tokens) {
    this.tokens = tokens;
    this.pos = 0;
  }

  current() {
    return this.tokens[this.pos];
  }

  match(type, value) {
    const tok = this.current();
    if (!tok) return false;
    if (tok.type === type && (value === undefined || tok.value === value)) {
      this.pos += 1;
      return tok;
    }
    return false;
  }

  expect(type, value) {
    const tok = this.match(type, value);
    if (!tok) {
      const label = value ?? type;
      const got = this.current();
      throw new Error(`Expected ${label} at ${got?.line ?? '?'}:${got?.column ?? '?'}`);
    }
    return tok;
  }

  parseProgram() {
    const body = [];
    while (this.current()?.type !== 'eof') {
      body.push(this.parseDeclOrExpr());
    }
    this.expect('eof');
    return { type: 'Program', body };
  }

  parseDeclOrExpr() {
    if (this.match('keyword', 'let')) {
      if (this.match('punct', '(')) {
        const names = [];
        if (!this.match('punct', ')')) {
          do {
            const ident = this.expect('identifier');
            names.push(ident.value);
          } while (this.match('punct', ','));
          this.expect('punct', ')');
        }
        if (!names.length) throw new Error('Destructuring requires at least one binding');
        this.expect('operator', '=');
        const value = this.parseExpr();
        return { type: 'LetTuple', names, value };
      }
      const nameToken = this.expect('identifier');
      this.expect('operator', '=');
      const value = this.parseExpr();
      return { type: 'LetDecl', name: nameToken.value, value };
    }
    if (this.match('keyword', 'state')) {
      const nameToken = this.expect('identifier');
      this.expect('operator', '=');
      const value = this.parseExpr();
      return { type: 'StateDecl', name: nameToken.value, value };
    }
    return this.parseExpr();
  }

  parseExpr() {
    return this.parseBinaryExpr(0);
  }

  parseBinaryExpr(minPrec) {
    let left = this.parsePrimary();
    while (true) {
      const token = this.current();
      if (!token || token.type !== 'operator') break;
      const prec = PRECEDENCE[token.value];
      if (prec === undefined || prec < minPrec) break;
      this.pos += 1;
      const right = this.parseBinaryExpr(prec + 1);
      left = { type: 'Binary', op: token.value, left, right };
    }
    return left;
  }

  parsePrimary() {
    if (this.match('keyword', 'read')) return this.parseRead();
    if (this.match('keyword', 'lift1')) return this.parseLift1();
    if (this.match('keyword', 'lift2')) return this.parseLift2();
    if (this.match('keyword', 'const')) return this.parseConst();
    if (this.match('keyword', 'D')) return this.parseD();
    if (this.match('keyword', 'true')) return { type: 'ScalarLiteral', value: { re: 1, im: 0 } };
    if (this.match('keyword', 'false')) return { type: 'ScalarLiteral', value: { re: 0, im: 0 } };

    const keywordHelper = this.current();
    const keywordLookahead = this.tokens[this.pos + 1];
    const keywordHelperName = canonicalHelperName(keywordHelper?.value);
    if (
      keywordHelper?.type === 'keyword' &&
      keywordHelperName &&
      keywordLookahead?.type === 'punct' &&
      keywordLookahead.value === '('
    ) {
      this.pos += 1;
      return this.parseHelperCall(keywordHelperName, keywordHelper.value);
    }

    const special = this.current();
    const lookahead = this.tokens[this.pos + 1];
    if (
      special?.type === 'identifier' &&
      special.value === 'uvalue_of' &&
      lookahead?.type === 'punct' &&
      lookahead.value === '('
    ) {
      this.pos += 1;
      return this.parseUValueOf();
    }
    if (
      special?.type === 'identifier' &&
      special.value === 'frac' &&
      lookahead?.type === 'punct' &&
      lookahead.value === '('
    ) {
      this.pos += 1;
      return this.parseFrac();
    }
    if (
      special?.type === 'identifier' &&
      special.value === 'assemble' &&
      lookahead?.type === 'punct' &&
      lookahead.value === '{'
    ) {
      this.pos += 1;
      return this.parseAssemble();
    }

    if (this.match('punct', '{')) {
      const items = [];
      if (!this.match('punct', '}')) {
        do {
          items.push(this.parseExpr());
        } while (this.match('punct', ','));
        this.expect('punct', '}');
      }
      return { type: 'TupleLiteral', items };
    }

    const helperCandidate = this.current();
    const helperName = canonicalHelperName(helperCandidate?.value);
    if (
      helperCandidate?.type === 'identifier' &&
      helperName &&
      lookahead?.type === 'punct' &&
      lookahead.value === '('
    ) {
      this.pos += 1;
      return this.parseHelperCall(helperName, helperCandidate.value);
    }

    if (this.match('punct', '(')) {
      const expr = this.parseExpr();
      this.expect('punct', ')');
      return expr;
    }

    const number = this.match('number');
    if (number) return { type: 'ScalarLiteral', value: number.value };

    const ident = this.match('identifier');
    if (ident) return { type: 'Identifier', name: ident.value };

    throw new Error('Unexpected token in expression');
  }

  parseRead() {
    this.expect('punct', '(');
    const value = this.parseExpr();
    this.expect('punct', '|');
    const state = this.parseExpr();
    this.expect('punct', ')');
    return { type: 'Read', value, state };
  }

  parseLift1() {
    this.expect('punct', '(');
    const fn = this.expect('identifier').value;
    this.expect('punct', ',');
    const arg = this.parseExpr();
    this.expect('punct', ')');
    return { type: 'Lift1', funcName: fn, arg };
  }

  parseLift2() {
    this.expect('punct', '(');
    const fn = this.expect('identifier').value;
    this.expect('punct', ',');
    const left = this.parseExpr();
    this.expect('punct', ',');
    const right = this.parseExpr();
    this.expect('punct', ')');
    return { type: 'Lift2', funcName: fn, left, right };
  }

  parseConst() {
    this.expect('punct', '(');
    const literal = this.parseExpr();
    this.expect('punct', ')');
    return { type: 'Const', value: literal };
  }

  parseD() {
    this.expect('punct', '(');
    const dimensionLiteral = this.expect('number');
    if (dimensionLiteral.value.im !== 0) throw new Error('Dimension must be real');
    const dimension = Math.max(1, Math.floor(dimensionLiteral.value.re));
    this.expect('punct', ',');
    const stateExpr = this.parseExpr();
    this.expect('punct', ')');
    return { type: 'DTransform', dimension, stateExpr };
  }

  parseHelperCall(name, rawName = null) {
    this.expect('punct', '(');
    const args = [];
    if (!this.match('punct', ')')) {
      do {
        args.push(this.parseExpr());
      } while (this.match('punct', ','));
      this.expect('punct', ')');
    }
    const normalizedArgs = reshapeHelperArgs(name, rawName, args);
    return { type: 'HelperCall', name, args: normalizedArgs };
  }

  parseUValueOf() {
    this.expect('punct', '(');
    this.expect('punct', '{');
    const entries = [];
    if (!this.match('punct', '}')) {
      do {
        const token = this.expect('number');
        if (token.value.im !== 0) throw new Error('uvalue_of index must be real');
        const rawIndex = Math.floor(token.value.re);
        if (!Number.isFinite(rawIndex) || rawIndex < 0) throw new Error('uvalue_of index must be >= 0');
        this.expect('punct', ':');
        const expr = this.parseExpr();
        entries.push({ index: rawIndex, expr });
      } while (this.match('punct', ','));
      this.expect('punct', '}');
    }
    this.expect('punct', ')');
    return { type: 'UValueOf', entries };
  }

  parseFrac() {
    this.expect('punct', '(');
    const numerator = this.parseExpr();
    this.expect('punct', ',');
    const denominator = this.parseExpr();
    this.expect('punct', ')');
    return { type: 'FracCall', numerator, denominator };
  }

  parseAssemble() {
    this.expect('punct', '{');
    const entries = [];
    if (!this.match('punct', '}')) {
      do {
        const key = this.expect('number');
        if (key.value.im !== 0) throw new Error('assemble index must be real');
        const index = Math.floor(key.value.re);
        if (!Number.isFinite(index) || index < 0) throw new Error('assemble index must be >= 0');
        this.expect('punct', ':');
        const expr = this.parseExpr();
        entries.push({ index, expr });
      } while (this.match('punct', ','));
      this.expect('punct', '}');
    }
    return { type: 'Assemble', entries };
  }
}

class Compiler {
  constructor() {
    this.instructions = [];
    this.envTypes = new Map();
    this.order = [];
  }

  resolveReturnType(spec) {
    if (!spec) return 'void';
    if (spec.returnTuple) return tupleType(spec.returnTuple);
    const declared = spec.returnType;
    if (Array.isArray(declared)) return tupleType(declared);
    if (declared && isTupleType(declared)) return tupleType(declared.elements ?? []);
    return declared ?? 'void';
  }

  ensureUValueType(type, context) {
    if (type === 'uvalue') return 'uvalue';
    if (type === 'scalar') {
      this.emit('MAKE_CONST_UVALUE');
      return 'uvalue';
    }
    throw new Error(`${context} expects UValue but received ${type}`);
  }

  ensureScalarType(type, context) {
    if (type !== 'scalar') throw new Error(`${context} expects scalar but received ${type}`);
    return 'scalar';
  }

  coerceHelperArg(type, expected, helperName, index) {
    if (!expected) return type;
    const label = `${helperName} arg ${index + 1}`;
    if (expected === 'uvalue') {
      if (type === 'ustate') return 'uvalue';
      return this.ensureUValueType(type, label);
    }
    if (expected === 'scalar') return this.ensureScalarType(type, label);
    if (expected === 'scalarOrUValue') {
      if (type === 'scalar' || type === 'uvalue') return type;
      throw new Error(`${label} expects scalar or UValue but received ${describeTypeName(type)}`);
    }
    if (expected === 'stateLike') {
      if (type === 'ustate') return 'ustate';
      if (type === 'uvalue') return 'uvalue';
      if (type === 'scalar') {
        this.emit('MAKE_CONST_UVALUE');
        return 'uvalue';
      }
      throw new Error(`${label} expects UState or UValue but received ${describeTypeName(type)}`);
    }
    if (expected === 'tuple') {
      if (isTupleType(type)) return type;
      throw new Error(`${label} expects tuple but received ${describeTypeName(type)}`);
    }
    return type;
  }

  extractScalarLiteral(node) {
    if (!node) return null;
    if (node.type === 'ScalarLiteral' && node.value) return node.value;
    if (node.type === 'Const') return this.extractScalarLiteral(node.value);
    return null;
  }

  compile(program) {
    this.instructions = [];
    this.envTypes = new Map();
    this.order = [];
    let finalType = 'void';
    for (const node of program.body) {
      if (node.type === 'LetDecl') {
        const exprType = this.emitExpr(node.value);
        if (isTupleType(exprType)) {
          throw new Error(`let ${node.name} expects a single value but received a tuple; destructure with let (...) = ...`);
        }
        this.emit('STORE', node.name);
        this.envTypes.set(node.name, exprType);
        if (!this.order.includes(node.name)) this.order.push(node.name);
        finalType = 'void';
      } else if (node.type === 'LetTuple') {
        const exprType = this.emitExpr(node.value);
        if (!isTupleType(exprType)) throw new Error('Destructuring requires a tuple value');
        const elements = exprType.elements ?? [];
        if (elements.length !== node.names.length) {
          throw new Error(`Destructuring expected ${node.names.length} values but received ${elements.length}`);
        }
        this.emit('UNPACK_TUPLE', elements.length);
        for (let i = node.names.length - 1; i >= 0; i -= 1) {
          const name = node.names[i];
          const elementType = elements[i];
          this.emit('STORE', name);
          this.envTypes.set(name, elementType);
          if (!this.order.includes(name)) this.order.push(name);
        }
        finalType = 'void';
      } else if (node.type === 'StateDecl') {
        let exprType = this.emitExpr(node.value);
        if (exprType === 'uvalue') {
          this.emit('UVALUE_TO_STATE');
          exprType = 'ustate';
        }
        if (exprType !== 'ustate') throw new Error(`state ${node.name} must be UState-compatible`);
        this.emit('NORM_STATE');
        this.emit('STORE', node.name);
        this.envTypes.set(node.name, 'ustate');
        if (!this.order.includes(node.name)) this.order.push(node.name);
        finalType = 'void';
      } else {
        finalType = this.emitExpr(node);
      }
    }
    this.emit('HALT');
    return { instructions: this.instructions, finalType, envTypes: this.envTypes, order: this.order };
  }

  emit(op, ...args) {
    this.instructions.push({ op, args });
  }

  emitExpr(node) {
    switch (node.type) {
      case 'ScalarLiteral': {
        const re = encodeReal(node.value.re);
        const im = encodeReal(node.value.im);
        this.emit('PUSH_SCALAR', re, im);
        return 'scalar';
      }
      case 'Identifier': {
        if (!this.envTypes.has(node.name)) throw new Error(`Unknown identifier ${node.name}`);
        this.emit('LOAD', node.name);
        return this.envTypes.get(node.name);
      }
      case 'Const': {
        const literal = this.extractScalarLiteral(node.value);
        if (literal) {
          this.emit('PUSH_SCALAR', encodeReal(literal.re), encodeReal(literal.im));
        } else {
          const type = this.emitExpr(node.value);
          if (type !== 'scalar') throw new Error(`const(arg) requires scalar but received ${type}`);
        }
        this.emit('MAKE_CONST_UVALUE');
        return 'uvalue';
      }
      case 'Binary': {
        let leftType = this.emitExpr(node.left);
        let rightType = this.emitExpr(node.right);
        if (node.op === '+u' || node.op === '*u') {
          leftType = this.ensureUValueType(leftType, `${node.op} left operand`);
          rightType = this.ensureUValueType(rightType, `${node.op} right operand`);
          this.emit(node.op === '+u' ? 'UADD' : 'UMUL');
          return 'uvalue';
        }
        if (node.op === '*s') {
          const types = [leftType, rightType];
          const scalarCount = types.filter((t) => t === 'scalar').length;
          const uvalueCount = types.filter((t) => t === 'uvalue').length;
          if (scalarCount === 2 || (scalarCount === 1 && uvalueCount === 1)) {
            this.emit('SSCALE');
            return 'uvalue';
          }
          if (scalarCount === 0 && uvalueCount === 2) {
            throw new Error(`*s cannot scale two UValues (received ${leftType} * ${rightType}); use *u for element-wise multiplication`);
          }
          throw new Error(`*s expects either two scalars or a scalar/UValue pair but received ${leftType} * ${rightType}`);
        }
        throw new Error(`Unknown binary op ${node.op}`);
      }
      case 'Lift1': {
        const type = this.emitExpr(node.arg);
        this.ensureUValueType(type, 'lift1 argument');
        this.emit('LIFT1', node.funcName);
        return 'uvalue';
      }
      case 'Lift2': {
        const leftType = this.emitExpr(node.left);
        const rightType = this.emitExpr(node.right);
        this.ensureUValueType(leftType, 'lift2 left argument');
        this.ensureUValueType(rightType, 'lift2 right argument');
        this.emit('LIFT2', node.funcName);
        return 'uvalue';
      }
      case 'Read': {
        const valueType = this.emitExpr(node.value);
        if (valueType !== 'uvalue') throw new Error('read value must be UValue');
        let stateType = this.emitExpr(node.state);
        if (stateType === 'uvalue') {
          this.emit('UVALUE_TO_STATE');
          stateType = 'ustate';
        }
        if (stateType !== 'ustate') throw new Error('read state must be UState');
        this.emit('READ');
        return 'scalar';
      }
      case 'DTransform': {
        let type = this.emitExpr(node.stateExpr);
        if (type === 'uvalue') {
          this.emit('UVALUE_TO_STATE');
          type = 'ustate';
        }
        if (type !== 'ustate') throw new Error('D expects a state');
        this.emit('D_TRANSFORM', node.dimension);
        this.emit('NORM_STATE');
        return 'ustate';
      }
      case 'UValueOf': {
        const indexes = [];
        for (const entry of node.entries) {
          const type = this.emitExpr(entry.expr);
          this.ensureUValueType(type, 'uvalue_of entry');
          indexes.push(entry.index);
        }
        this.emit('BUILD_UVALUE_OF', indexes);
        return 'uvalue';
      }
      case 'FracCall': {
        this.ensureUValueType(this.emitExpr(node.numerator), 'frac numerator');
        this.ensureUValueType(this.emitExpr(node.denominator), 'frac denominator');
        this.emit('LIFT2', 'divide');
        return 'uvalue';
      }
      case 'TupleLiteral': {
        const elementTypes = node.items.map((item) => this.emitExpr(item));
        this.emit('BUILD_TUPLE', elementTypes.length);
        return tupleType(elementTypes);
      }
      case 'HelperCall': {
        const spec = HELPER_SPECS[node.name];
        if (!spec) throw new Error(`Unknown helper ${node.name}`);
        const requiredArgs = spec.required ?? [];
        const optionalArgs = spec.optional ?? [];
        const variadicType = spec.variadicType;
        const argCount = node.args.length;
        const minArgs = requiredArgs.length;
        const maxArgs = variadicType ? Infinity : minArgs + optionalArgs.length;
        const exceedsMax = Number.isFinite(maxArgs) && argCount > maxArgs;
        if (argCount < minArgs || exceedsMax) {
          const upper = Number.isFinite(maxArgs) ? maxArgs : 'unlimited';
          throw new Error(`${node.name} expects between ${minArgs} and ${upper} args but received ${argCount}`);
        }
        const expectedTypes = requiredArgs.slice();
        const optionalSpan = Math.max(0, Math.min(optionalArgs.length, argCount - minArgs));
        for (let i = 0; i < optionalSpan; i += 1) expectedTypes.push(optionalArgs[i]);
        node.args.forEach((arg, idx) => {
          let actualType = this.emitExpr(arg);
          const expected = expectedTypes[idx] ?? variadicType;
          actualType = this.coerceHelperArg(actualType, expected, node.name, idx);
          expectedTypes[idx] = actualType;
        });
        this.emit('CALL_HELPER', node.name, argCount);
        return this.resolveReturnType(spec);
      }
      case 'Assemble': {
        if (!node.entries.length) {
          this.emit('PUSH_SCALAR', 0, 0);
          this.emit('MAKE_CONST_UVALUE');
          return 'uvalue';
        }
        node.entries.forEach((entry, idx) => {
          const injectNode = {
            type: 'HelperCall',
            name: 'inject',
            args: [
              entry.expr,
              { type: 'ScalarLiteral', value: { re: entry.index, im: 0 } }
            ]
          };
          const injectType = this.emitExpr(injectNode);
          this.ensureUValueType(injectType, 'assemble entry');
          if (idx > 0) this.emit('UADD');
        });
        return 'uvalue';
      }
      default:
        throw new Error(`Unhandled AST node ${node.type}`);
    }
  }
}

class NovelTracker {
  constructor() {
    this.entries = [];
  }

  record(op, args, index) {
    const id = this.entries.length + 1;
    this.entries.push({ id, op, args, index });
    return id;
  }
}

class VirtualMachine {
  constructor({ microstates = DEFAULT_MICROSTATES, diagnostics = null } = {}) {
    this.M = clampMicrostateCount(microstates);
    this.heap = { values: [], states: [], novels: new NovelTracker() };
    this.env = new Map();
    this.order = [];
    this.stack = [];
    this.ip = 0;
    this.trace = [];
    this.lastValue = null;
    this.diagnostics = diagnostics;
  }

  ensureMicrostates(target) {
    const desired = clampMicrostateCount(target);
    if (desired <= this.M) return;
    const filler = () => ({ real: 0, imag: 0 });
    this.heap.values.forEach((arr) => {
      for (let i = arr.length; i < desired; i += 1) arr[i] = filler();
    });
    this.heap.states.forEach((arr) => {
      for (let i = arr.length; i < desired; i += 1) arr[i] = filler();
    });
    this.M = desired;
  }

  cloneValue(value) {
    if (!value) return value;
    if (value.kind === 'scalar') {
      const clone = { kind: 'scalar', data: cloneComplex(value.data) };
      if (value.novelId != null) clone.novelId = value.novelId;
      return clone;
    }
    if (value.kind === 'tuple') {
      return { kind: 'tuple', items: value.items.map((item) => this.cloneValue(item)) };
    }
    return { kind: value.kind, ref: value.ref };
  }

  push(value) {
    this.stack.push(value);
  }

  pop() {
    const value = this.stack.pop();
    if (!value) throw new Error('Stack underflow');
    return value;
  }

  extractSimplexVector(ref) {
    const values = this.heap.values[ref];
    const simplex = new Array(this.M);
    let total = 0;
    for (let i = 0; i < this.M; i += 1) {
      const magnitude = Math.max(0, decodeReal(magnitudeSquared(values[i])));
      simplex[i] = magnitude;
      total += magnitude;
    }
    if (total <= 0) {
      const fallback = 1 / Math.max(1, this.M);
      return simplex.map(() => fallback);
    }
    return simplex.map((value) => value / total);
  }

  extractNonnegativeVector(ref) {
    const values = this.heap.values[ref];
    const vector = new Array(this.M);
    for (let i = 0; i < this.M; i += 1) {
      const magnitude = Math.max(0, decodeReal(magnitudeSquared(values[i])));
      vector[i] = magnitude;
    }
    return vector;
  }

  simplexToUValue(vector) {
    const arr = new Array(this.M);
    for (let i = 0; i < this.M; i += 1) {
      const value = Number.isFinite(vector[i]) ? vector[i] : 0;
      arr[i] = { real: encodeReal(value), imag: 0 };
    }
    const ref = this.allocateUValue(arr);
    return { kind: 'uvalue', ref };
  }

  envSet(name, value) {
    this.env.set(name, this.cloneValue(value));
    if (!this.order.includes(name)) this.order.push(name);
  }

  envGet(name) {
    if (!this.env.has(name)) throw new Error(`Unbound variable '${name}'. Declare it with let/state before use.`);
    const value = this.env.get(name);
    return this.cloneValue(value);
  }

  allocateUValue(initializer) {
    const id = this.heap.values.push(initializer) - 1;
    return id;
  }

  allocateUState(initializer) {
    const id = this.heap.states.push(initializer) - 1;
    return id;
  }

  normalizeState(id) {
    const state = this.heap.states[id];
    let sum = 0;
    for (const c of state) sum = addQ16(sum, magnitudeSquared(c));
    const decoded = decodeReal(sum);
    if (decoded <= 0) {
      const uniform = encodeReal(1 / Math.sqrt(this.M));
      for (let i = 0; i < this.M; i += 1) {
        state[i] = { real: uniform, imag: 0 };
      }
      return;
    }
    const scale = encodeReal(1 / Math.sqrt(decoded));
    for (let i = 0; i < this.M; i += 1) {
      const c = state[i];
      state[i] = {
        real: mulQ16(c.real, scale),
        imag: mulQ16(c.imag, scale),
        novelId: c.novelId
      };
    }
  }

  makeUniformStateValue() {
    const amp = encodeReal(1 / Math.sqrt(Math.max(1, this.M)));
    const arr = Array.from({ length: this.M }, () => ({ real: amp, imag: 0 }));
    const ref = this.allocateUState(arr);
    this.normalizeState(ref);
    return { kind: 'ustate', ref };
  }

  stateToUValue(value, helperName = 'state') {
    if (!value || value.kind !== 'ustate') throw new Error(`${helperName} expects a state input`);
    const state = this.heap.states[value.ref];
    if (!Array.isArray(state)) throw new Error(`${helperName} references an unknown state`);
    const arr = state.map(cloneComplex);
    const ref = this.allocateUValue(arr);
    return { kind: 'uvalue', ref };
  }

  ensureUValueArg(value, helperName) {
    if (!value) throw new Error(`${helperName} expects a UValue argument`);
    if (value.kind === 'uvalue') return value;
    if (value.kind === 'ustate') return this.stateToUValue(value, helperName);
    throw new Error(`${helperName} expects a UValue argument`);
  }

  ensureTupleArg(value, label, { allowEmpty = false } = {}) {
    if (!value || value.kind !== 'tuple') throw new Error(`${label} expects a tuple argument`);
    const items = Array.isArray(value.items) ? value.items : [];
    if (!allowEmpty && items.length === 0) {
      throw new Error(`${label} tuple must include at least one entry`);
    }
    return items;
  }

  resolveUValueListArg(value, label) {
    if (!value) throw new Error(`${label} is required`);
    if (value.kind === 'tuple') {
      const items = this.ensureTupleArg(value, label);
      return items.map((item, idx) => this.ensureUValueArg(item, `${label}[${idx}]`));
    }
    return [this.ensureUValueArg(value, label)];
  }

  extractScalarList(value, label) {
    if (!value) throw new Error(`${label} tuple is required`);
    if (value.kind === 'tuple') {
      const items = this.ensureTupleArg(value, label);
      return items.map((item, idx) => this.scalarToFloat(item, `${label}[${idx}]`));
    }
    if (value.kind === 'scalar') {
      return [this.scalarToFloat(value, label)];
    }
    throw new Error(`${label} expects scalar tuple`);
  }

  extractIndexList(value, label) {
    const scalars = this.extractScalarList(value, label);
    return scalars.map((entry, idx) => {
      if (!Number.isFinite(entry)) throw new Error(`${label}[${idx}] must be finite`);
      return Math.trunc(entry);
    });
  }

  resolveStateValue(input) {
    if (!input) return this.makeUniformStateValue();
    if (input.kind === 'ustate') return input;
    if (input.kind === 'uvalue') {
      const arr = this.heap.values[input.ref].map(cloneComplex);
      const ref = this.allocateUState(arr);
      this.normalizeState(ref);
      return { kind: 'ustate', ref };
    }
    throw new Error('State argument must be a UState or UValue');
  }

  scalarToFloat(value, label) {
    if (!value || value.kind !== 'scalar') throw new Error(`${label} expects a scalar`);
    if (value.novelId != null) {
      throw new Error(`${label} cannot be derived from a novel value`);
    }
    return decodeReal(value.data.real);
  }

  clampIndexPosition(v) {
    if (!Number.isFinite(v)) return 0;
    const maxIndex = Math.max(0, this.M - 1);
    if (maxIndex === 0) return 0;
    return Math.min(maxIndex, Math.max(0, Math.floor(v)));
  }

  stateFromRange(startValue, endValue) {
    if (this.M <= 0) return this.makeUniformStateValue();
    const startIdx = this.clampIndexPosition(startValue);
    const endIdx = this.clampIndexPosition(endValue);
    const lo = Math.min(startIdx, endIdx);
    const hi = Math.max(startIdx, endIdx);
    const span = hi - lo + 1;
    if (span <= 0) return this.makeUniformStateValue();
    const amp = encodeReal(1 / Math.sqrt(span));
    const arr = new Array(this.M);
    for (let i = 0; i < this.M; i += 1) {
      if (i >= lo && i <= hi) {
        arr[i] = { real: amp, imag: 0 };
      } else {
        arr[i] = { real: 0, imag: 0 };
      }
    }
    const ref = this.allocateUState(arr);
    this.normalizeState(ref);
    return { kind: 'ustate', ref };
  }

  stateFromMask(maskValue) {
    if (!maskValue || maskValue.kind !== 'uvalue') throw new Error('state_from_mask expects a UValue mask');
    const mask = this.heap.values[maskValue.ref];
    const arr = new Array(this.M);
    let hasSupport = false;
    for (let i = 0; i < this.M; i += 1) {
      const entry = mask[i] || { real: 0, imag: 0 };
      if (entry.novelId) {
        arr[i] = { real: 0, imag: 0 };
        continue;
      }
      const weight = Math.max(0, decodeReal(entry.real));
      if (weight > 0) hasSupport = true;
      const amp = weight > 0 ? encodeReal(Math.sqrt(weight)) : 0;
      arr[i] = { real: amp, imag: 0 };
    }
    if (!hasSupport) return this.makeUniformStateValue();
    const ref = this.allocateUState(arr);
    this.normalizeState(ref);
    return { kind: 'ustate', ref };
  }

  computeExpectation(uvalueRef, stateRef) {
    const values = this.heap.values[uvalueRef];
    const state = this.heap.states[stateRef];
    if (!values || !state) throw new Error('Invalid references for expectation');
    this.assertDimension(values, 'UValue');
    this.assertDimension(state, 'UState');
    let accRe = 0;
    let accIm = 0;
    let weightSum = 0;
    let novelId = null;
    for (let i = 0; i < this.M; i += 1) {
      const psiEntry = state[i];
      if (psiEntry?.novelId) {
        novelId = psiEntry.novelId;
        break;
      }
      const psi2Word = magnitudeSquared(psiEntry);
      const weight = decodeReal(psi2Word);
      weightSum += weight;
      const sample = values[i];
      if (sample?.novelId) {
        novelId = sample.novelId;
        break;
      }
      accRe += decodeReal(sample.real) * weight;
      accIm += decodeReal(sample.imag) * weight;
    }
    if (novelId != null) {
      return { re: 0, im: 0, weight: 0, novelId };
    }
    const safeWeight = weightSum || 1;
    return { re: accRe / safeWeight, im: accIm / safeWeight, weight: safeWeight, novelId: null };
  }

  computeVariance(uvalueRef, stateRef, mean) {
    const values = this.heap.values[uvalueRef];
    const state = this.heap.states[stateRef];
    if (!values || !state) throw new Error('Invalid references for variance');
    if (mean?.novelId != null) {
      return { value: 0, novelId: mean.novelId };
    }
    this.assertDimension(values, 'UValue');
    this.assertDimension(state, 'UState');
    let acc = 0;
    let weightSum = 0;
    let novelId = null;
    for (let i = 0; i < this.M; i += 1) {
      const psiEntry = state[i];
      if (psiEntry?.novelId) {
        novelId = psiEntry.novelId;
        break;
      }
      const psi2Word = magnitudeSquared(psiEntry);
      const weight = decodeReal(psi2Word);
      weightSum += weight;
      const sample = values[i];
      if (sample?.novelId) {
        novelId = sample.novelId;
        break;
      }
      const diffRe = decodeReal(sample.real) - mean.re;
      const diffIm = decodeReal(sample.imag) - mean.im;
      const mag2 = diffRe * diffRe + diffIm * diffIm;
      acc += mag2 * weight;
    }
    if (novelId != null) {
      return { value: 0, novelId };
    }
    const safeWeight = weightSum || 1;
    return { value: acc / safeWeight, novelId: null };
  }

  computeDensity(uvalueRef, stateRef) {
    const mask = this.heap.values[uvalueRef];
    const state = this.heap.states[stateRef];
    if (!mask || !state) throw new Error('Invalid references for density');
    this.assertDimension(mask, 'UValue');
    this.assertDimension(state, 'UState');
    let acc = 0;
    let weightSum = 0;
    let novelId = null;
    for (let i = 0; i < this.M; i += 1) {
      const psiEntry = state[i];
      if (psiEntry?.novelId) {
        novelId = psiEntry.novelId;
        break;
      }
      const psi2Word = magnitudeSquared(psiEntry);
      const weight = decodeReal(psi2Word);
      weightSum += weight;
      const sample = mask[i];
      if (sample?.novelId) {
        novelId = sample.novelId;
        break;
      }
      const value = Math.max(0, Math.min(1, decodeReal(sample.real)));
      acc += value * weight;
    }
    if (novelId != null) {
      return { value: 0, novelId };
    }
    const safeWeight = weightSum || 1;
    return { value: acc / safeWeight, novelId: null };
  }

  makeScalarValue(real, imag = 0, novelId = null) {
    const safeReal = Number.isFinite(real) ? real : 0;
    const safeImag = Number.isFinite(imag) ? imag : 0;
    const scalar = {
      kind: 'scalar',
      data: { real: encodeReal(safeReal), imag: encodeReal(safeImag) }
    };
    if (novelId != null) scalar.novelId = novelId;
    return scalar;
  }

  sampleUValueAt(uvalueRef, index) {
    const arr = this.heap.values[uvalueRef] ?? [];
    const clamped = this.clampIndexPosition(index);
    const sample = arr[clamped];
    if (!sample) return { real: 0, imag: 0 };
    return cloneComplex(sample);
  }

  buildCollection(uvalueArgs) {
    const out = Array.from({ length: this.M }, () => ({ real: 0, imag: 0 }));
    const limit = Math.min(this.M, uvalueArgs.length);
    for (let i = 0; i < limit; i += 1) {
      const value = this.ensureUValueArg(uvalueArgs[i], 'collection');
      out[i] = this.sampleUValueAt(value.ref, i);
    }
    const ref = this.allocateUValue(out);
    return { kind: 'uvalue', ref };
  }

  buildMaskRange(startValue, endValue) {
    const lo = Math.max(0, Math.min(startValue, endValue));
    const hi = Math.max(0, Math.max(startValue, endValue));
    const start = Math.min(this.M, Math.floor(lo));
    const endExclusive = Math.min(this.M, Math.ceil(hi));
    const one = encodeReal(1);
    const out = new Array(this.M);
    for (let i = 0; i < this.M; i += 1) {
      const on = i >= start && i < endExclusive ? one : 0;
      out[i] = { real: on, imag: 0 };
    }
    const ref = this.allocateUValue(out);
    return { kind: 'uvalue', ref };
  }

  buildMaskThreshold(valueRef, thresholdRef) {
    const values = this.heap.values[valueRef] ?? [];
    const thresholds = this.heap.values[thresholdRef] ?? [];
    const one = encodeReal(1);
    const out = new Array(this.M);
    for (let i = 0; i < this.M; i += 1) {
      const left = values[i];
      const right = thresholds[i];
      if (!left || left.novelId || !right || right.novelId) {
        out[i] = { real: 0, imag: 0 };
        continue;
      }
      const flag = decodeReal(left.real) >= decodeReal(right.real) ? one : 0;
      out[i] = { real: flag, imag: 0 };
    }
    const ref = this.allocateUValue(out);
    return { kind: 'uvalue', ref };
  }

  coerceScalarLike(value, label) {
    if (!value) throw new Error(`${label} expects scalar or UValue`);
    if (value.kind === 'scalar') {
      const sample = cloneComplex(value.data);
      if (value.novelId != null) sample.novelId = value.novelId;
      return sample;
    }
    if (value.kind === 'uvalue') return cloneComplex(this.sampleUValueAt(value.ref, 0));
    throw new Error(`${label} expects scalar or UValue`);
  }

  buildInjection(valueArg, indexArg, dimensionArg) {
    const payload = this.coerceScalarLike(valueArg, 'inject value');
    const index = this.scalarToFloat(indexArg, 'inject index');
    const rawDim = dimensionArg ? this.scalarToFloat(dimensionArg, 'inject dimension') : this.M;
    const target = clampMicrostateCount(Math.max(1, Math.floor(rawDim)));
    this.ensureMicrostates(target);
    const arr = Array.from({ length: this.M }, () => ({ real: 0, imag: 0 }));
    const clamped = this.clampIndexPosition(index);
    arr[clamped] = cloneComplex(payload);
    const ref = this.allocateUValue(arr);
    return { kind: 'uvalue', ref };
  }

  applyUnaryLiftHelper(fnName, arg, label) {
    const value = this.ensureUValueArg(arg, label);
    const fn = resolveUnaryFunction(fnName);
    if (!fn) throw new Error(`Unknown lift1 function ${fnName}`);
    const arr = this.heap.values[value.ref] ?? [];
    this.assertDimension(arr, label);
    const out = new Array(this.M);
    for (let i = 0; i < this.M; i += 1) {
      const sample = arr[i] ?? { real: 0, imag: 0 };
      out[i] = fn(sample, i, this.heap.novels);
    }
    const ref = this.allocateUValue(out);
    return { kind: 'uvalue', ref };
  }

  applyBinaryLiftHelper(fnName, leftArg, rightArg, label) {
    const left = this.ensureUValueArg(leftArg, `${label} left operand`);
    const right = this.ensureUValueArg(rightArg, `${label} right operand`);
    const fn = BinaryLibrary[fnName];
    if (!fn) throw new Error(`Unknown lift2 function ${fnName}`);
    const arrL = this.heap.values[left.ref] ?? [];
    const arrR = this.heap.values[right.ref] ?? [];
    this.assertDimension(arrL, `${label} left operand`);
    this.assertDimension(arrR, `${label} right operand`);
    const out = new Array(this.M);
    for (let i = 0; i < this.M; i += 1) {
      const a = arrL[i] ?? { real: 0, imag: 0 };
      const b = arrR[i] ?? { real: 0, imag: 0 };
      out[i] = fn(a, b, i, this.heap.novels);
    }
    const ref = this.allocateUValue(out);
    return { kind: 'uvalue', ref };
  }

  combineUValues(leftArg, rightArg, label, reducer) {
    const left = this.ensureUValueArg(leftArg, `${label} left operand`);
    const right = this.ensureUValueArg(rightArg, `${label} right operand`);
    const arrL = this.heap.values[left.ref] ?? [];
    const arrR = this.heap.values[right.ref] ?? [];
    this.assertDimension(arrL, `${label} left operand`);
    this.assertDimension(arrR, `${label} right operand`);
    const out = new Array(this.M);
    for (let i = 0; i < this.M; i += 1) {
      const a = arrL[i] ?? { real: 0, imag: 0 };
      const b = arrR[i] ?? { real: 0, imag: 0 };
      out[i] = reducer(a, b);
    }
    const ref = this.allocateUValue(out);
    return { kind: 'uvalue', ref };
  }

  negateUValue(arg, label) {
    const value = this.ensureUValueArg(arg, label);
    const arr = this.heap.values[value.ref] ?? [];
    const out = new Array(this.M);
    for (let i = 0; i < this.M; i += 1) {
      const sample = arr[i] ?? { real: 0, imag: 0 };
      out[i] = {
        real: clampWord(-sample.real),
        imag: clampWord(-sample.imag),
        novelId: sample.novelId
      };
    }
    const ref = this.allocateUValue(out);
    return { kind: 'uvalue', ref };
  }

  assertDimension(arr, label) {
    if (!Array.isArray(arr)) throw new Error(`${label} storage missing`);
    if (arr.length !== this.M) {
      throw new Error(`${label} dimension mismatch: expected ${this.M} microstates, received ${arr.length}`);
    }
  }

  makeDeltaState(indexValue) {
    const idx = this.clampIndexPosition(indexValue);
    const arr = Array.from({ length: this.M }, (_, i) => ({ real: i === idx ? encodeReal(1) : 0, imag: 0 }));
    const ref = this.allocateUState(arr);
    this.normalizeState(ref);
    return { kind: 'ustate', ref };
  }

  performRead(valueRef, stateRef) {
    const f = this.heap.values[valueRef];
    const psi = this.heap.states[stateRef];
    if (!f || !psi) throw new Error('Invalid references for read');
    this.assertDimension(f, 'UValue');
    this.assertDimension(psi, 'UState');
    let accReal = 0;
    let accImag = 0;
    let novelId = null;
    for (let i = 0; i < this.M; i += 1) {
      const psiEntry = psi[i];
      if (psiEntry?.novelId) {
        novelId = psiEntry.novelId;
        break;
      }
      const psi2 = magnitudeSquared(psiEntry);
      const sample = f[i];
      if (sample?.novelId) {
        novelId = sample.novelId;
        break;
      }
      accReal = addQ16(accReal, mulQ16(sample.real, psi2));
      accImag = addQ16(accImag, mulQ16(sample.imag, psi2));
    }
    if (novelId != null) {
      return { real: 0, imag: 0, novelId };
    }
    return { real: accReal, imag: accImag };
  }

  computeSmoothness(valueRef) {
    const uniform = this.makeUniformStateValue();
    const values = this.heap.values[valueRef];
    const psi = this.heap.states[uniform.ref];
    if (!values || !psi) return this.makeScalarValue(0, 0);
    let acc = 0;
    for (let i = 0; i < this.M; i += 1) {
      const psi2 = decodeReal(magnitudeSquared(psi[i]));
      const sample = values[i];
      if (sample?.novelId) {
        return this.makeScalarValue(0, 0, sample.novelId);
      }
      const mag = Math.sqrt(Math.max(0, decodeReal(magnitudeSquared(sample))));
      acc += mag * psi2;
    }
    return this.makeScalarValue(acc, 0);
  }

  applyDTransform(stateValue, dimensionArg = null) {
    if (!stateValue) throw new Error('D expects a state value');
    let state = stateValue;
    if (state.kind !== 'ustate') {
      if (state.kind === 'uvalue') {
        state = this.resolveStateValue(state);
      } else {
        throw new Error('D expects a state or UValue');
      }
    }
    const requested = Number.isFinite(dimensionArg) ? clampMicrostateCount(Math.floor(dimensionArg)) : this.M;
    this.ensureMicrostates(requested);
    const arr = this.heap.states[state.ref];
    const rotated = new Array(this.M);
    const offsetRaw = Number.isFinite(dimensionArg) ? Math.floor(dimensionArg) : 0;
    const offset = this.M === 0 ? 0 : ((offsetRaw % this.M) + this.M) % this.M;
    for (let i = 0; i < this.M; i += 1) {
      const target = this.M === 0 ? 0 : (i + offset) % this.M;
      rotated[target] = cloneComplex(arr[i]);
    }
    const ref = this.allocateUState(rotated);
    this.normalizeState(ref);
    return { kind: 'ustate', ref };
  }

  invokeHelper(name, args) {
    switch (name) {
      case 'uniform_state':
      case 'psi_uniform':
        return this.makeUniformStateValue();
      case 'state': {
        const input = this.ensureUValueArg(args[0], 'state');
        const arr = this.heap.values[input.ref].map(cloneComplex);
        const ref = this.allocateUState(arr);
        this.normalizeState(ref);
        return { kind: 'ustate', ref };
      }
      case 'delta_state': {
        const index = this.scalarToFloat(args[0], 'delta_state index');
        return this.makeDeltaState(index);
      }
      case 'state_from_mask': {
        const mask = this.ensureUValueArg(args[0], 'state_from_mask');
        return this.stateFromMask(mask);
      }
      case 'state_range': {
        const start = this.scalarToFloat(args[0], 'state_range start');
        const end = this.scalarToFloat(args[1], 'state_range end');
        return this.stateFromRange(start, end);
      }
      case 'mask_range': {
        const start = this.scalarToFloat(args[0], 'mask_range start');
        const end = this.scalarToFloat(args[1], 'mask_range end');
        return this.buildMaskRange(start, end);
      }
      case 'mask_threshold': {
        const value = this.ensureUValueArg(args[0], 'mask_threshold value');
        const threshold = this.ensureUValueArg(args[1], 'mask_threshold threshold');
        return this.buildMaskThreshold(value.ref, threshold.ref);
      }
      case 'mask_lt':
        return this.applyBinaryLiftHelper('lt', args[0], args[1], 'mask_lt');
      case 'mask_gt':
        return this.applyBinaryLiftHelper('gt', args[0], args[1], 'mask_gt');
      case 'mask_eq':
        return this.applyBinaryLiftHelper('eq', args[0], args[1], 'mask_eq');
      case 'collection':
        return this.buildCollection(args);
      case 'NORM': {
        const value = this.ensureUValueArg(args[0], 'NORM');
        const normalized = UNSOperators.NORM(this.extractNonnegativeVector(value.ref));
        return this.simplexToUValue(normalized);
      }
      case 'MERGE': {
        const vectorArg = args[0];
        const vectors = this.resolveUValueListArg(vectorArg, 'MERGE vectors');
        const simplexVectors = vectors.map((entry) => this.extractSimplexVector(entry.ref));
        const weights = args[1] ? this.extractScalarList(args[1], 'MERGE weights') : undefined;
        const merged = UNSOperators.MERGE(simplexVectors, weights);
        return this.simplexToUValue(merged);
      }
      case 'MASK': {
        const value = this.ensureUValueArg(args[0], 'MASK value');
        const mask = this.ensureUValueArg(args[1], 'MASK mask');
        const result = UNSOperators.MASK(this.extractSimplexVector(value.ref), this.extractNonnegativeVector(mask.ref));
        return this.simplexToUValue(result);
      }
      case 'PROJECT': {
        const value = this.ensureUValueArg(args[0], 'PROJECT value');
        const subset = this.extractIndexList(args[1], 'PROJECT subset');
        const projected = UNSOperators.PROJECT(this.extractSimplexVector(value.ref), subset);
        return this.simplexToUValue(projected);
      }
      case 'OVERLAP': {
        const u = this.ensureUValueArg(args[0], 'OVERLAP u');
        const v = this.ensureUValueArg(args[1], 'OVERLAP v');
        const overlap = UNSOperators.OVERLAP(this.extractSimplexVector(u.ref), this.extractSimplexVector(v.ref));
        return this.simplexToUValue(overlap);
      }
      case 'DOT': {
        const u = this.ensureUValueArg(args[0], 'DOT u');
        const v = this.ensureUValueArg(args[1], 'DOT v');
        const dotValue = UNSOperators.DOT(this.extractSimplexVector(u.ref), this.extractSimplexVector(v.ref));
        return this.makeScalarValue(dotValue, 0);
      }
      case 'DIST_L1': {
        const u = this.ensureUValueArg(args[0], 'DIST_L1 u');
        const v = this.ensureUValueArg(args[1], 'DIST_L1 v');
        const distance = UNSOperators.DIST_L1(this.extractSimplexVector(u.ref), this.extractSimplexVector(v.ref));
        return this.makeScalarValue(distance, 0);
      }
      case 'inject':
        return this.buildInjection(args[0], args[1], args[2]);
      case 'absU':
        return this.applyUnaryLiftHelper('abs', args[0], 'absU');
      case 'sqrtU':
        return this.applyUnaryLiftHelper('sqrt', args[0], 'sqrtU');
      case 'negU':
        return this.negateUValue(args[0], 'negU');
      case 'normU':
        return this.applyUnaryLiftHelper('norm', args[0], 'normU');
      case 'addU':
        return this.combineUValues(args[0], args[1], 'addU', (a, b) => {
          const sum = complexAdd(a, b);
          if (!sum.novelId) sum.novelId = a.novelId || b.novelId;
          return sum;
        });
      case 'subU':
        return this.combineUValues(args[0], args[1], 'subU', (a, b) => {
          const neg = { real: clampWord(-b.real), imag: clampWord(-b.imag), novelId: b.novelId };
          const diff = complexAdd(a, neg);
          if (!diff.novelId) diff.novelId = a.novelId || b.novelId;
          return diff;
        });
      case 'mulU':
        return this.combineUValues(args[0], args[1], 'mulU', (a, b) => {
          const prod = complexMul(a, b);
          prod.novelId = a.novelId || b.novelId;
          return prod;
        });
      case 'divU':
        return this.applyBinaryLiftHelper('divide', args[0], args[1], 'divU');
      case 'powU':
        return this.applyBinaryLiftHelper('pow', args[0], args[1], 'powU');
      case 'printU': {
        const value = this.ensureUValueArg(args[0], 'printU');
        if (this.diagnostics && typeof this.diagnostics.print === 'function') {
          this.diagnostics.print(formatUValueSlice(this, value.ref, 128));
        }
        return null;
      }
      case 'plotU': {
        const value = this.ensureUValueArg(args[0], 'plotU');
        if (this.diagnostics && typeof this.diagnostics.plot === 'function') {
          this.diagnostics.plot(this.extractMagnitudeSeries(value.ref, Math.min(this.M, 512)));
        }
        return null;
      }
      case 'CANCEL': {
        const u = this.ensureUValueArg(args[0], 'CANCEL u');
        const v = this.ensureUValueArg(args[1], 'CANCEL v');
        const simplexU = this.extractSimplexVector(u.ref);
        const simplexV = this.extractSimplexVector(v.ref);
        const [uResidual, vResidual] = UNSOperators.CANCEL(simplexU, simplexV);
        return {
          kind: 'tuple',
          items: [this.simplexToUValue(uResidual), this.simplexToUValue(vResidual)]
        };
      }
      case 'CANCEL_JOINT': {
        const u = this.ensureUValueArg(args[0], 'CANCEL_JOINT u');
        const v = this.ensureUValueArg(args[1], 'CANCEL_JOINT v');
        const simplexU = this.extractSimplexVector(u.ref);
        const simplexV = this.extractSimplexVector(v.ref);
        const joint = UNSOperators.CANCEL_JOINT(simplexU, simplexV);
        return this.simplexToUValue(joint);
      }
      case 'MIX': {
        const u = this.ensureUValueArg(args[0], 'MIX u');
        const v = this.ensureUValueArg(args[1], 'MIX v');
        const alphaRaw = args[2] ? this.scalarToFloat(args[2], 'MIX α') : 0;
        const alpha = clampUnitInterval(alphaRaw);
        const beta = 1 - alpha;
        const alphaScalar = { real: encodeReal(alpha), imag: 0 };
        const betaScalar = { real: encodeReal(beta), imag: 0 };
        const arrU = this.heap.values[u.ref];
        const arrV = this.heap.values[v.ref];
        const out = new Array(this.M);
        for (let i = 0; i < this.M; i += 1) {
          const scaledU = complexScale(alphaScalar, arrU[i]);
          const scaledV = complexScale(betaScalar, arrV[i]);
          const mixed = complexAdd(scaledU, scaledV);
          mixed.novelId = scaledU.novelId || scaledV.novelId;
          out[i] = mixed;
        }
        const ref = this.allocateUValue(out);
        return { kind: 'uvalue', ref };
      }
      case 'invokeDKeyword': {
        if (args.length < 2) {
          throw new Error('invokeDKeyword expects (dimension, state) arguments');
        }
        const dimension = this.scalarToFloat(args[0], 'invokeDKeyword dimension');
        const state = this.resolveStateValue(args[1]);
        return this.applyDTransform(state, dimension);
      }
      case 'meanU': {
        const value = this.ensureUValueArg(args[0], 'meanU');
        const state = args[1] ? this.resolveStateValue(args[1]) : this.makeUniformStateValue();
        const data = this.performRead(value.ref, state.ref);
        if (data.novelId != null) return this.makeScalarValue(0, 0, data.novelId);
        return { kind: 'scalar', data };
      }
      case 'sumU': {
        const value = this.ensureUValueArg(args[0], 'sumU');
        const state = args[1] ? this.resolveStateValue(args[1]) : this.makeUniformStateValue();
        const data = this.performRead(value.ref, state.ref);
        if (data.novelId != null) return this.makeScalarValue(0, 0, data.novelId);
        const { re, im } = complexToFloat(data);
        return this.makeScalarValue(re * this.M, im * this.M);
      }
      case 'integralU': {
        const value = this.ensureUValueArg(args[0], 'integralU');
        const state = args[1] ? this.resolveStateValue(args[1]) : this.makeUniformStateValue();
        const mean = this.computeExpectation(value.ref, state.ref);
        if (mean.novelId != null) return this.makeScalarValue(0, 0, mean.novelId);
        return this.makeScalarValue(mean.re * this.M, mean.im * this.M);
      }
      case 'varianceU': {
        const value = this.ensureUValueArg(args[0], 'varianceU');
        const state = args[1] ? this.resolveStateValue(args[1]) : this.makeUniformStateValue();
        const mean = this.computeExpectation(value.ref, state.ref);
        if (mean.novelId != null) return this.makeScalarValue(0, 0, mean.novelId);
        const variance = this.computeVariance(value.ref, state.ref, mean);
        if (variance.novelId != null) return this.makeScalarValue(0, 0, variance.novelId);
        return this.makeScalarValue(variance.value, 0);
      }
      case 'stddevU':
      case 'stdU': {
        const value = this.ensureUValueArg(args[0], name);
        const state = args[1] ? this.resolveStateValue(args[1]) : this.makeUniformStateValue();
        const mean = this.computeExpectation(value.ref, state.ref);
        if (mean.novelId != null) return this.makeScalarValue(0, 0, mean.novelId);
        const variance = this.computeVariance(value.ref, state.ref, mean);
        if (variance.novelId != null) return this.makeScalarValue(0, 0, variance.novelId);
        return this.makeScalarValue(Math.sqrt(Math.max(0, variance.value)), 0);
      }
      case 'densityU': {
        const mask = this.ensureUValueArg(args[0], 'densityU');
        const state = args[1] ? this.resolveStateValue(args[1]) : this.makeUniformStateValue();
        const density = this.computeDensity(mask.ref, state.ref);
        if (density.novelId != null) return this.makeScalarValue(0, 0, density.novelId);
        return this.makeScalarValue(Math.max(0, Math.min(1, density.value)), 0);
      }
      case 'integrate': {
        const value = this.ensureUValueArg(args[0], 'integrate');
        const state = this.resolveStateValue(args[1]);
        const data = this.performRead(value.ref, state.ref);
        if (data.novelId != null) return this.makeScalarValue(0, 0, data.novelId);
        return { kind: 'scalar', data };
      }
      case 'mean': {
        const value = this.ensureUValueArg(args[0], 'mean');
        const state = this.makeUniformStateValue();
        const data = this.performRead(value.ref, state.ref);
        if (data.novelId != null) return this.makeScalarValue(0, 0, data.novelId);
        return { kind: 'scalar', data };
      }
      case 'variance': {
        const value = this.ensureUValueArg(args[0], 'variance');
        const state = this.resolveStateValue(args[1]);
        const mean = this.computeExpectation(value.ref, state.ref);
        if (mean.novelId != null) return this.makeScalarValue(0, 0, mean.novelId);
        const variance = this.computeVariance(value.ref, state.ref, mean);
        if (variance.novelId != null) return this.makeScalarValue(0, 0, variance.novelId);
        return this.makeScalarValue(variance.value, 0);
      }
      case 'smoothness': {
        const value = this.ensureUValueArg(args[0], 'smoothness');
        return this.computeSmoothness(value.ref);
      }
      default:
        throw new Error(`Unknown helper ${name}`);
    }
  }

  describeValue(value) {
    if (!value) return 'void';
    if (value.kind === 'scalar') {
      if (value.novelId != null) {
        return `novel#${value.novelId}`;
      }
      const { re, im } = complexToFloat(value.data);
      return `(${re.toFixed(4)} + ${im.toFixed(4)}i)`;
    }
    if (value.kind === 'uvalue') {
      const arr = this.heap.values[value.ref];
      const sample = arr[0];
      const { re, im } = complexToFloat(sample);
      return `μ0=${re.toFixed(3)}+${im.toFixed(3)}i`;
    }
    if (value.kind === 'ustate') {
      const norm = this.computeStateNorm(value.ref);
      return `norm≈${norm.toFixed(4)}`;
    }
    if (value.kind === 'tuple') {
      return `tuple(${value.items?.length ?? 0})`;
    }
    return 'novel';
  }

  computeStateNorm(ref) {
    const state = this.heap.states[ref];
    let sum = 0;
    for (const c of state) sum = addQ16(sum, magnitudeSquared(c));
    return Math.sqrt(Math.max(0, decodeReal(sum)));
  }

  extractMagnitudeSeries(ref, limit = 512) {
    const arr = this.heap.values[ref] ?? [];
    const span = Math.min(arr.length, limit);
    const series = new Array(span);
    for (let i = 0; i < span; i += 1) {
      const sample = arr[i] ?? { real: 0, imag: 0 };
      const magnitude = Math.sqrt(Math.max(0, decodeReal(magnitudeSquared(sample))));
      series[i] = magnitude;
    }
    return series;
  }

  formatUValueSlice(ref, limit = 96) {
    return formatUValueSlice(this, ref, limit);
  }

  formatUStateSlice(ref, limit = 96) {
    return formatUStateLines(this, ref, limit);
  }

  execute(program) {
    this.ip = 0;
    this.trace = [];
    while (this.ip < program.length) {
      const instr = program[this.ip];
      const { op, args } = instr;
      this.trace.push(`${this.ip.toString().padStart(3, '0')} | ${op} ${args.map(String).join(', ')}`.trim());
      switch (op) {
        case 'PUSH_SCALAR': {
          this.push({ kind: 'scalar', data: { real: args[0], imag: args[1] } });
          break;
        }
        case 'MAKE_CONST_UVALUE': {
          const scalar = this.pop();
          if (scalar.kind !== 'scalar') throw new Error('MAKE_CONST_UVALUE expects scalar');
          const arr = Array.from({ length: this.M }, () => cloneComplex(scalar.data));
          const ref = this.allocateUValue(arr);
          this.push({ kind: 'uvalue', ref });
          break;
        }
        case 'MAKE_STATE': {
          this.push(this.makeUniformStateValue());
          break;
        }
        case 'UVALUE_TO_STATE': {
          const value = this.pop();
          if (value.kind !== 'uvalue') throw new Error('UVALUE_TO_STATE expects UValue');
          const arr = this.heap.values[value.ref].map(cloneComplex);
          const ref = this.allocateUState(arr);
          this.normalizeState(ref);
          this.push({ kind: 'ustate', ref });
          break;
        }
        case 'LOAD': {
          this.push(this.envGet(args[0]));
          break;
        }
        case 'STORE': {
          const value = this.pop();
          this.envSet(args[0], value);
          break;
        }
        case 'UADD': {
          const b = this.pop();
          const a = this.pop();
          if (a.kind !== 'uvalue' || b.kind !== 'uvalue') throw new Error('UADD operands must be UValue');
          const arrA = this.heap.values[a.ref];
          const arrB = this.heap.values[b.ref];
          const out = new Array(this.M);
          for (let i = 0; i < this.M; i += 1) {
            const ca = arrA[i];
            const cb = arrB[i];
            const sum = complexAdd(ca, cb);
            sum.novelId = ca.novelId || cb.novelId;
            out[i] = sum;
          }
          const ref = this.allocateUValue(out);
          this.push({ kind: 'uvalue', ref });
          break;
        }
        case 'UMUL': {
          const b = this.pop();
          const a = this.pop();
          if (a.kind !== 'uvalue' || b.kind !== 'uvalue') throw new Error('UMUL operands must be UValue');
          const arrA = this.heap.values[a.ref];
          const arrB = this.heap.values[b.ref];
          const out = new Array(this.M);
          for (let i = 0; i < this.M; i += 1) {
            const prod = complexMul(arrA[i], arrB[i]);
            prod.novelId = arrA[i].novelId || arrB[i].novelId;
            out[i] = prod;
          }
          const ref = this.allocateUValue(out);
          this.push({ kind: 'uvalue', ref });
          break;
        }
        case 'SSCALE': {
          const second = this.pop();
          const first = this.pop();
          if (first.kind === 'scalar' && second.kind === 'scalar') {
            const product = complexMul(first.data, second.data);
            const arr = Array.from({ length: this.M }, () => cloneComplex(product));
            const ref = this.allocateUValue(arr);
            this.push({ kind: 'uvalue', ref });
            break;
          }
          let scalar; let uval;
          if (first.kind === 'scalar' && second.kind === 'uvalue') {
            scalar = first;
            uval = second;
          } else if (first.kind === 'uvalue' && second.kind === 'scalar') {
            scalar = second;
            uval = first;
          } else {
            throw new Error('SSCALE requires a scalar and a UValue (or two scalars)');
          }
          const arr = this.heap.values[uval.ref];
          const out = new Array(this.M);
          for (let i = 0; i < this.M; i += 1) {
            const scaled = complexScale(scalar.data, arr[i]);
            scaled.novelId = arr[i].novelId;
            out[i] = scaled;
          }
          const ref = this.allocateUValue(out);
          this.push({ kind: 'uvalue', ref });
          break;
        }
        case 'LIFT1': {
          const value = this.pop();
          if (value.kind !== 'uvalue') throw new Error('LIFT1 expects UValue');
          const fn = resolveUnaryFunction(args[0]);
          if (!fn) throw new Error(`Unknown lift1 function '${args[0]}'`);
          const arr = this.heap.values[value.ref];
          const out = new Array(this.M);
          for (let i = 0; i < this.M; i += 1) {
            const result = fn(arr[i], i, this.heap.novels);
            out[i] = result;
          }
          const ref = this.allocateUValue(out);
          this.push({ kind: 'uvalue', ref });
          break;
        }
        case 'LIFT2': {
          const right = this.pop();
          const left = this.pop();
          if (left.kind !== 'uvalue' || right.kind !== 'uvalue') {
            throw new Error('LIFT2 expects UValues');
          }
          const fn = BinaryLibrary[args[0]];
          if (!fn) throw new Error(`Unknown lift2 function '${args[0]}'`);
          const arrL = this.heap.values[left.ref];
          const arrR = this.heap.values[right.ref];
          const out = new Array(this.M);
          for (let i = 0; i < this.M; i += 1) {
            const result = fn(arrL[i], arrR[i], i, this.heap.novels);
            out[i] = result;
          }
          const ref = this.allocateUValue(out);
          this.push({ kind: 'uvalue', ref });
          break;
        }
        case 'READ': {
          const state = this.pop();
          const value = this.pop();
          if (value.kind !== 'uvalue' || state.kind !== 'ustate') {
            throw new Error('READ expects UValue | UState');
          }
          const data = this.performRead(value.ref, state.ref);
          const result = { kind: 'scalar', data };
          if (data.novelId != null) result.novelId = data.novelId;
          this.push(result);
          break;
        }
        case 'NORM_STATE': {
          const state = this.pop();
          if (state.kind !== 'ustate') throw new Error('NORM_STATE expects UState');
          this.normalizeState(state.ref);
          this.push(state);
          break;
        }
        case 'D_TRANSFORM': {
          const state = this.pop();
          const transformed = this.applyDTransform(state, args[0]);
          this.push(transformed);
          break;
        }
        case 'CALL_HELPER': {
          const [helperName, argc = 0] = args;
          const callArgs = [];
          for (let i = 0; i < argc; i += 1) {
            callArgs.unshift(this.pop());
          }
          const result = this.invokeHelper(helperName, callArgs);
          if (result) this.push(result);
          break;
        }
        case 'BUILD_TUPLE': {
          const count = args[0] ?? 0;
          const items = [];
          for (let i = 0; i < count; i += 1) {
            items.unshift(this.cloneValue(this.pop()));
          }
          this.push({ kind: 'tuple', items });
          break;
        }
        case 'BUILD_UVALUE_OF': {
          const indexes = args[0] ?? [];
          const out = Array.from({ length: this.M }, () => ({ real: 0, imag: 0 }));
          const values = new Array(indexes.length);
          for (let i = indexes.length - 1; i >= 0; i -= 1) {
            values[i] = this.ensureUValueArg(this.pop(), 'uvalue_of');
          }
          for (let i = 0; i < indexes.length; i += 1) {
            const idx = this.clampIndexPosition(indexes[i]);
            out[idx] = this.sampleUValueAt(values[i].ref, idx);
          }
          const ref = this.allocateUValue(out);
          this.push({ kind: 'uvalue', ref });
          break;
        }
        case 'UNPACK_TUPLE': {
          const expected = args[0] ?? 0;
          const tuple = this.pop();
          if (!tuple || tuple.kind !== 'tuple') throw new Error('UNPACK_TUPLE requires a tuple');
          const items = tuple.items ?? [];
          if (items.length !== expected) {
            throw new Error(`UNPACK_TUPLE expected ${expected} values but received ${items.length}`);
          }
          for (let i = 0; i < items.length; i += 1) {
            this.push(this.cloneValue(items[i]));
          }
          break;
        }
        case 'HALT': {
          this.lastValue = this.stack[this.stack.length - 1] ?? null;
          return this.lastValue;
        }
        default:
          throw new Error(`Unknown opcode ${op}`);
      }
      this.ip += 1;
    }
    return this.lastValue;
  }

  snapshotBindings() {
    return this.order
      .map((name) => {
        const value = this.env.get(name);
        if (!value) return null;
        return {
          name,
          kind: value.kind,
          summary: this.describeValue(value)
        };
      })
      .filter(Boolean);
  }

  listNames(kind) {
    return this.order.filter((name) => this.env.get(name)?.kind === kind);
  }

  readNamed(valueName, stateName) {
    const value = this.env.get(valueName);
    const state = this.env.get(stateName);
    if (!value || !state) throw new Error('Missing binding');
    if (value.kind !== 'uvalue' || state.kind !== 'ustate') throw new Error('read() requires value + state');
    const data = this.performRead(value.ref, state.ref);
    if (data.novelId != null) return { novelId: data.novelId };
    return complexToFloat(data);
  }
}

function formatUValueSlice(vm, ref, limit = 96) {
  const arr = vm.heap.values[ref] ?? [];
  if (!arr.length) return 'No microstates available.';
  const lines = [];
  const span = Math.min(arr.length, limit);
  for (let i = 0; i < span; i += 1) {
    const sample = arr[i] ?? { real: 0, imag: 0 };
    const { re, im } = complexToFloat(sample);
    const novel = sample.novelId ? ` novel#${sample.novelId}` : '';
    lines.push(`${i.toString().padStart(4, '0')}: ${re.toFixed(4)} + ${im.toFixed(4)}i${novel}`);
  }
  if (span < arr.length) lines.push(`... truncated ${arr.length - span} rows`);
  return lines.join('\n');
}

function formatUStateLines(vm, ref, limit = 96) {
  const arr = vm.heap.states[ref] ?? [];
  if (!arr.length) return 'No amplitudes stored.';
  const lines = [];
  const span = Math.min(arr.length, limit);
  for (let i = 0; i < span; i += 1) {
    const entry = arr[i] ?? { real: 0, imag: 0 };
    const weight = decodeReal(magnitudeSquared(entry));
    lines.push(`${i.toString().padStart(4, '0')}: |psi|^2 = ${weight.toFixed(6)}`);
  }
  if (span < arr.length) lines.push(`... truncated ${arr.length - span} rows`);
  return lines.join('\n');
}

function sampleUValuePreview(vm, ref, limit = 32) {
  const arr = vm.heap.values[ref] ?? [];
  const span = Math.min(arr.length, limit);
  const samples = [];
  for (let i = 0; i < span; i += 1) {
    const sample = arr[i] ?? { real: 0, imag: 0 };
    samples.push({
      index: i,
      real: decodeReal(sample.real ?? 0),
      imag: decodeReal(sample.imag ?? 0),
      novelId: sample.novelId ?? null
    });
  }
  return { samples, truncated: arr.length > span };
}

function sampleUStatePreview(vm, ref, limit = 32) {
  const arr = vm.heap.states[ref] ?? [];
  const span = Math.min(arr.length, limit);
  const amplitudes = [];
  for (let i = 0; i < span; i += 1) {
    const entry = arr[i] ?? { real: 0, imag: 0 };
    amplitudes.push({
      index: i,
      real: decodeReal(entry.real ?? 0),
      imag: decodeReal(entry.imag ?? 0),
      weight: decodeReal(magnitudeSquared(entry))
    });
  }
  return { amplitudes, truncated: arr.length > span };
}

function ensureSourceString(source) {
  if (typeof source !== 'string') throw new Error('source must be a string');
  const normalized = source.replace(/^\uFEFF/, '');
  if (!normalized.trim()) throw new Error('source must not be empty');
  return normalized;
}

function cloneTokensForOutput(tokens) {
  return tokens.map((token) => ({
    type: token.type,
    value: token.value && typeof token.value === 'object' ? { ...token.value } : token.value,
    line: token.line,
    column: token.column
  }));
}

function createDiagnosticsRecorder(options = {}) {
  const maxPrint = options.maxPrint ?? 64;
  const maxPlot = options.maxPlot ?? 16;
  const printLogs = [];
  const plotLogs = [];
  return {
    handlers: {
      print(text) {
        if (printLogs.length >= maxPrint) return;
        printLogs.push(String(text ?? ''));
      },
      plot(series) {
        if (plotLogs.length >= maxPlot) return;
        const copy = Array.isArray(series) ? series.slice() : [];
        plotLogs.push(copy);
      }
    },
    snapshot() {
      return {
        print: [...printLogs],
        plots: plotLogs.map((series) => series.slice())
      };
    }
  };
}

function serializeValue(vm, value, previewLimit = 32) {
  if (!value) return null;
  const summary = typeof vm.describeValue === 'function' ? vm.describeValue(value) : value.kind;
  if (value.kind === 'scalar') {
    const payload = {
      kind: 'scalar',
      summary,
      real: decodeReal(value.data?.real ?? 0),
      imag: decodeReal(value.data?.imag ?? 0)
    };
    if (value.novelId != null) payload.novelId = value.novelId;
    return payload;
  }
  if (value.kind === 'uvalue') {
    return {
      kind: 'uvalue',
      summary,
      preview: sampleUValuePreview(vm, value.ref, previewLimit)
    };
  }
  if (value.kind === 'ustate') {
    return {
      kind: 'ustate',
      summary,
      preview: sampleUStatePreview(vm, value.ref, previewLimit)
    };
  }
  if (value.kind === 'tuple') {
    return {
      kind: 'tuple',
      summary,
      items: (value.items ?? []).map((item) => serializeValue(vm, item, previewLimit))
    };
  }
  return { kind: value.kind ?? 'unknown', summary };
}

function compileSource(source) {
  const text = ensureSourceString(source);
  const tokens = tokenize(text);
  const parser = new Parser(tokens);
  const ast = parser.parseProgram();
  const compiler = new Compiler();
  const compilation = compiler.compile(ast);
  const envTypes = Array.from(compilation.envTypes.entries()).map(([name, type]) => ({ name, type }));
  return {
    sourceLength: text.length,
    tokens: cloneTokensForOutput(tokens),
    ast,
    instructions: compilation.instructions,
    finalType: compilation.finalType,
    envTypes,
    envOrder: [...compilation.order]
  };
}

function executeSource(source, options = {}) {
  const compilation = compileSource(source);
  const diagnosticsRecorder = createDiagnosticsRecorder(options.diagnostics);
  const vm = new VirtualMachine({
    microstates: options.microstates,
    diagnostics: diagnosticsRecorder.handlers
  });
  const resultValue = vm.execute(compilation.instructions);
  const reads = Array.isArray(options.reads)
    ? options.reads.map((entry) => {
        if (!entry || typeof entry !== 'object') throw new Error('Each read entry must be an object');
        const { value, state } = entry;
        if (typeof value !== 'string' || typeof state !== 'string') {
          throw new Error('Read entries require string value/state properties');
        }
        const measurement = vm.readNamed(value, state);
        if (measurement?.novelId != null) {
          return { value, state, novelId: measurement.novelId };
        }
        return { value, state, real: measurement.re, imag: measurement.im };
      })
    : [];
  return {
    ...compilation,
    microstates: vm.M,
    result: serializeValue(vm, resultValue, options.previewLimit ?? 32),
    bindings: vm.snapshotBindings(),
    trace: [...vm.trace],
    diagnostics: diagnosticsRecorder.snapshot(),
    reads
  };
}

module.exports = {
  tokenize,
  Parser,
  Compiler,
  VirtualMachine,
  compileSource,
  executeSource,
  serializeValue,
  HELPER_SPECS,
  DEFAULT_MICROSTATES,
  MAX_MICROSTATES,
  clampMicrostateCount
};
