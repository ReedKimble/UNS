(() => {
      const SCALE = 65536;
      const KEYWORD_LOOKUP = buildCaseLookup(["let", "state", "const", "read", "lift1", "lift2", "D", "true", "false"]);
      const RESERVED_LOOKUP = buildCaseLookup(["novel", "uvalue", "ustate", "scalar", "fn", "type"]);
      const SPECIAL_IDENTIFIERS = new Set(['uvalue_of', 'frac']);
      const DOC_EXPANDED_STORAGE_KEY = 'uns.docExplorer.expanded';
      const DOC_SELECTED_STORAGE_KEY = 'uns.docExplorer.selected';
      const INSPECTOR_TAB_STORAGE_KEY = 'uns.inspector.activeTab';
      const DIAGNOSTIC_FILTER_STORAGE_KEY = 'uns.diagnostics.filter';
      const MAX_DIAGNOSTIC_EVENTS = 150;
      const SVG_NS = 'http://www.w3.org/2000/svg';
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
      const PRECEDENCE = { "+u": 1, "*u": 2, "*s": 2 };
      const tupleType = (elements) => ({ kind: 'tuple', elements: Array.isArray(elements) ? [...elements] : [] });
      const isTupleType = (value) => Boolean(value && typeof value === 'object' && value.kind === 'tuple');
      function buildCaseLookup(words) {
        const map = new Map();
        words.forEach((word) => {
          if (!word) return;
          map.set(word.toLowerCase(), word);
        });
        return map;
      }

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
      const describeTypeName = (value) => {
        if (typeof value === 'string') return value;
        if (isTupleType(value)) {
          const count = value.elements?.length;
          const size = Number.isFinite(count) ? count : '?';
          return `tuple(${size})`;
        }
        if (!value) return 'void';
        return 'unknown';
      };
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
          if (vec.some(v => v < -EPS)) {
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
          const total = sum(arr);
          if (total > EPS) {
            return arr.map(v => v / total);
          }
          return uniform(arr.length);
        };

        const overlap = (u, v) => {
          const a = toArray(u, 'OVERLAP u');
          const b = toArray(v, 'OVERLAP v');
          ensureSameLength(a, b, 'u', 'v');
          return a.map((value, idx) => Math.min(value, b[idx]));
        };

        const subtract = (a, b) => a.map((value, idx) => {
          const diff = value - b[idx];
          return diff < 0 && Math.abs(diff) < 1e-14 ? 0 : Math.max(0, diff);
        });

        const addVectors = (vectors) => {
          const dim = vectors[0].length;
          const acc = Array(dim).fill(0);
          vectors.forEach(vec => {
            vec.forEach((value, idx) => {
              acc[idx] += value;
            });
          });
          return acc;
        };

        const renormResidual = (vec) => {
          const total = sum(vec);
          if (total > EPS) return vec.map(v => v / total);
          return uniform(vec.length);
        };

        const mix = (u, v, alpha) => {
          const a = toArray(u, 'MIX u');
          const b = toArray(v, 'MIX v');
          ensureSameLength(a, b, 'u', 'v');
          assertNonNegative(a, 'MIX u');
          assertNonNegative(b, 'MIX v');
          const clamped = clampAlpha(alpha ?? 0);
          return a.map((value, idx) => (clamped * value) + ((1 - clamped) * b[idx]));
        };

        const merge = (vectors, weights) => {
          if (!Array.isArray(vectors) || vectors.length === 0) {
            throw new Error('MERGE requires at least one vector');
          }
          const arrays = vectors.map((vec, idx) => toArray(vec, `MERGE input ${idx}`));
          const dim = arrays[0].length;
          arrays.forEach((arr, idx) => {
            if (arr.length !== dim) throw new Error(`MERGE input ${idx} has mismatched dimension`);
            assertNonNegative(arr, `MERGE input ${idx}`);
          });
          const normalizedWeights = (weights ?? []).map((w, idx) => {
            if (w === undefined) return 1;
            if (w < 0) throw new Error(`MERGE weight ${idx} must be nonnegative`);
            return w;
          });
          const coeffs = arrays.map((_, idx) => normalizedWeights[idx] ?? 1);
          if (coeffs.every(weight => weight <= EPS)) {
            return uniform(dim);
          }
          const accumulator = Array(dim).fill(0);
          arrays.forEach((arr, idx) => {
            const weight = coeffs[idx];
            arr.forEach((value, j) => {
              accumulator[j] += weight * value;
            });
          });
          return normalize(accumulator);
        };

        const split = (u, alphas) => {
          const base = toArray(u, 'SPLIT input');
          assertNonNegative(base, 'SPLIT input');
          if (!Array.isArray(alphas) || alphas.length === 0) {
            throw new Error('SPLIT requires coefficient array');
          }
          const totalAlpha = sum(alphas);
          if (Math.abs(totalAlpha - 1) > SUM_TOLERANCE) {
            throw new Error('SPLIT coefficients must sum to 1');
          }
          return alphas.map((alpha, idx) => {
            if (alpha < -EPS) throw new Error(`SPLIT alpha ${idx} must be nonnegative`);
            return base.map(value => alpha * value);
          });
        };

        const cancel = (u, v) => {
          const a = toArray(u, 'CANCEL u');
          const b = toArray(v, 'CANCEL v');
          ensureSameLength(a, b, 'u', 'v');
          assertNonNegative(a, 'CANCEL u');
          assertNonNegative(b, 'CANCEL v');
          const w = overlap(a, b);
          const uRaw = subtract(a, w);
          const vRaw = subtract(b, w);
          return [renormResidual(uRaw), renormResidual(vRaw)];
        };

        const cancelJoint = (u, v) => {
          const a = toArray(u, 'CANCEL_JOINT u');
          const b = toArray(v, 'CANCEL_JOINT v');
          ensureSameLength(a, b, 'u', 'v');
          const w = overlap(a, b);
          const uRaw = subtract(a, w);
          const vRaw = subtract(b, w);
          const residual = addVectors([uRaw, vRaw]);
          return renormResidual(residual);
        };

        const mask = (u, maskVector) => {
          const base = toArray(u, 'MASK input');
          const maskArr = toArray(maskVector, 'MASK mask');
          ensureSameLength(base, maskArr, 'u', 'mask');
          assertNonNegative(base, 'MASK input');
          assertNonNegative(maskArr, 'MASK mask');
          const attenuated = base.map((value, idx) => value * maskArr[idx]);
          return normalize(attenuated);
        };

        const project = (u, subset) => {
          const indices = new Set(subset ?? []);
          const base = toArray(u, 'PROJECT input');
          const maskVector = base.map((_, idx) => (indices.has(idx) ? 1 : 0));
          return mask(base, maskVector);
        };

        const dot = (u, v) => {
          const a = toArray(u, 'DOT u');
          const b = toArray(v, 'DOT v');
          ensureSameLength(a, b, 'u', 'v');
          return Math.min(1, Math.max(0, a.reduce((acc, value, idx) => acc + value * b[idx], 0)));
        };

        const distL1 = (u, v) => {
          const a = toArray(u, 'DIST_L1 u');
          const b = toArray(v, 'DIST_L1 v');
          ensureSameLength(a, b, 'u', 'v');
          const total = a.reduce((acc, value, idx) => acc + Math.abs(value - b[idx]), 0);
          return Math.min(1, Math.max(0, 0.5 * total));
        };

        const checkSimplex = (vec, label) => {
          assertNonNegative(vec, label);
          const total = sum(vec);
          if (Math.abs(total - 1) > 5 * SUM_TOLERANCE) {
            throw new Error(`${label} must sum to 1 (was ${total})`);
          }
        };

        const approxEqualVec = (a, b) => {
          if (a.length !== b.length) return false;
          return a.every((value, idx) => Math.abs(value - b[idx]) <= 5 * SUM_TOLERANCE);
        };

        const runSelfTests = () => {
          const report = [];
          const record = (name, fn) => {
            try {
              fn();
              report.push({ name, status: 'ok' });
            } catch (err) {
              report.push({ name, status: 'fail', message: err.message });
              throw err;
            }
          };

          record('NORM invariants', () => {
            const u = [0.2, 0.3, 0.5];
            const normalized = normalize(u);
            checkSimplex(normalized, 'NORM(u)');
            const zero = normalize([0, 0, 0, 0]);
            checkSimplex(zero, 'NORM(0)');
          });

          record('MIX invariants', () => {
            const u = [0.7, 0.3];
            const v = [0.5, 0.5];
            const mixed = mix(u, v, 0.4);
            checkSimplex(mixed, 'mix result');
          });

          record('MERGE invariants', () => {
            const u = [0.6, 0.2, 0.2];
            const v = [0.1, 0.3, 0.6];
            const merged = merge([u, v], [2, 1]);
            checkSimplex(merged, 'MERGE result');
          });

          record('SPLIT coefficients', () => {
            const base = [0.5, 0.5];
            const parts = split(base, [0.25, 0.75]);
            if (parts.length !== 2) throw new Error('SPLIT returned wrong count');
            const sums = parts.map(sum);
            if (Math.abs(sums[0] - 0.25) > SUM_TOLERANCE) throw new Error('First split sum incorrect');
            if (Math.abs(sums[1] - 0.75) > SUM_TOLERANCE) throw new Error('Second split sum incorrect');
          });

          record('CANCEL symmetry', () => {
            const u = [0.6, 0.4];
            const v = [0.5, 0.5];
            const [u1, v1] = cancel(u, v);
            const [v2, u2] = cancel(v, u);
            if (!approxEqualVec(u1, u2) || !approxEqualVec(v1, v2)) {
              throw new Error('CANCEL residuals not symmetric');
            }
            checkSimplex(u1, 'CANCEL u residual');
            checkSimplex(v1, 'CANCEL v residual');
          });

          record('CANCEL_JOINT invariants', () => {
            const u = [0.3, 0.7];
            const v = [0.8, 0.2];
            const joint = cancelJoint(u, v);
            checkSimplex(joint, 'CANCEL_JOINT result');
          });

          record('MASK and PROJECT', () => {
            const u = [0.1, 0.4, 0.5];
            const masked = mask(u, [1, 0.5, 0]);
            checkSimplex(masked, 'MASK result');
            const projected = project(u, [0, 2]);
            checkSimplex(projected, 'PROJECT result');
            if (projected[1] !== projected[1]) {
              throw new Error('PROJECT produced NaN');
            }
          });

          record('Metric bounds', () => {
            const u = [0.9, 0.1];
            const v = [0.2, 0.8];
            const s = dot(u, v);
            const d = distL1(u, v);
            if (s < -SUM_TOLERANCE || s > 1 + SUM_TOLERANCE) throw new Error('DOT out of bounds');
            if (d < -SUM_TOLERANCE || d > 1 + SUM_TOLERANCE) throw new Error('DIST_L1 out of bounds');
          });

          return report;
        };

        const api = {
          EPSILON: EPS,
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

        const selfTestStatus = (() => {
          try {
            return { ok: true, report: runSelfTests() };
          } catch (err) {
            return { ok: false, error: err };
          }
        })();

        if (typeof window !== 'undefined') {
          window.UNSOperators = api;
          window.UNSOperatorTestReport = selfTestStatus;
        }

        if (selfTestStatus.ok) {
          console.info('UNS operator self-tests passed', selfTestStatus.report);
        } else {
          console.error('UNS operator self-tests failed', selfTestStatus.error);
        }

        return api;
      })();
      const SIMPLEX_OPERATOR_SPECS = [
        {
          key: 'NORM',
          label: 'NORM — Normalize vector',
          description: 'Rescales any nonnegative vector to the simplex (uniform fallback when the sum is zero).',
          args: [
            { key: 'vector', label: 'Vector', type: 'vector', placeholder: '[0.25, 0.25, 0.5]' }
          ],
          run: ({ vector }) => UNSOperators.NORM(vector)
        },
        {
          key: 'MIX',
          label: 'MIX — Convex mix',
          description: 'Clamps α into [0,1] before computing αu + (1−α)v.',
          args: [
            { key: 'u', label: 'Vector u', type: 'vector', placeholder: '[0.7, 0.3]' },
            { key: 'v', label: 'Vector v', type: 'vector', placeholder: '[0.5, 0.5]' },
            { key: 'alpha', label: 'α (0-1)', type: 'alpha', placeholder: '0.5' }
          ],
          run: ({ u, v, alpha }) => UNSOperators.MIX(u, v, alpha)
        },
        {
          key: 'MERGE',
          label: 'MERGE — Weighted union',
          description: 'Combines a family of vectors with optional weights, then normalizes.',
          args: [
            { key: 'vectors', label: 'Vectors (JSON array of arrays)', type: 'vectors', placeholder: '[[0.6,0.4],[0.1,0.9]]' },
            { key: 'weights', label: 'Weights (optional)', type: 'numberArray', optional: true, placeholder: '[2, 1]' }
          ],
          run: ({ vectors, weights }) => UNSOperators.MERGE(vectors, weights)
        },
        {
          key: 'SPLIT',
          label: 'SPLIT — Partition vector',
          description: 'Creates subnormalized components α_j u (coefficients must sum to 1).',
          args: [
            { key: 'vector', label: 'Vector', type: 'vector', placeholder: '[0.5, 0.3, 0.2]' },
            { key: 'coefficients', label: 'Coefficients (sum to 1)', type: 'numberArray', placeholder: '[0.25, 0.75]' }
          ],
          run: ({ vector, coefficients }) => UNSOperators.SPLIT(vector, coefficients)
        },
        {
          key: 'CANCEL',
          label: 'CANCEL — Remove overlap',
          description: 'Subtracts component-wise overlap, then normalizes each residual.',
          args: [
            { key: 'u', label: 'Vector u', type: 'vector', placeholder: '[0.6, 0.4]' },
            { key: 'v', label: 'Vector v', type: 'vector', placeholder: '[0.5, 0.5]' }
          ],
          run: ({ u, v }) => UNSOperators.CANCEL(u, v)
        },
        {
          key: 'CANCEL_JOINT',
          label: 'CANCEL_JOINT — Joint residual',
          description: 'Returns one vector encoding both non-overlapping parts.',
          args: [
            { key: 'u', label: 'Vector u', type: 'vector', placeholder: '[0.3, 0.7]' },
            { key: 'v', label: 'Vector v', type: 'vector', placeholder: '[0.8, 0.2]' }
          ],
          run: ({ u, v }) => UNSOperators.CANCEL_JOINT(u, v)
        },
        {
          key: 'MASK',
          label: 'MASK — Apply weights',
          description: 'Multiplies by a nonnegative mask and renormalizes.',
          args: [
            { key: 'vector', label: 'Vector', type: 'vector', placeholder: '[0.2, 0.4, 0.4]' },
            { key: 'mask', label: 'Mask vector', type: 'vector', placeholder: '[1, 0.5, 0]' }
          ],
          run: ({ vector, mask }) => UNSOperators.MASK(vector, mask)
        },
        {
          key: 'PROJECT',
          label: 'PROJECT — Pick indices',
          description: 'Keeps only selected indices via MASK with a binary mask.',
          args: [
            { key: 'vector', label: 'Vector', type: 'vector', placeholder: '[0.1, 0.2, 0.7]' },
            { key: 'subset', label: 'Indices (JSON array)', type: 'subset', placeholder: '[0, 2]' }
          ],
          run: ({ vector, subset }) => UNSOperators.PROJECT(vector, subset)
        },
        {
          key: 'OVERLAP',
          label: 'OVERLAP — Component minima',
          description: 'Returns min(u_i, v_i) without renormalization.',
          args: [
            { key: 'u', label: 'Vector u', type: 'vector', placeholder: '[0.6, 0.4]' },
            { key: 'v', label: 'Vector v', type: 'vector', placeholder: '[0.5, 0.5]' }
          ],
          run: ({ u, v }) => UNSOperators.OVERLAP(u, v)
        },
        {
          key: 'DOT',
          label: 'DOT — Similarity',
          description: 'Computes ∑ u_i v_i (bounded inside [0,1]).',
          args: [
            { key: 'u', label: 'Vector u', type: 'vector', placeholder: '[0.9, 0.1]' },
            { key: 'v', label: 'Vector v', type: 'vector', placeholder: '[0.2, 0.8]' }
          ],
          run: ({ u, v }) => UNSOperators.DOT(u, v)
        },
        {
          key: 'DIST_L1',
          label: 'DIST_L1 — L1 distance',
          description: 'Returns 0.5 · ∑ |u_i − v_i| (also bounded inside [0,1]).',
          args: [
            { key: 'u', label: 'Vector u', type: 'vector', placeholder: '[0.9, 0.1]' },
            { key: 'v', label: 'Vector v', type: 'vector', placeholder: '[0.2, 0.8]' }
          ],
          run: ({ u, v }) => UNSOperators.DIST_L1(u, v)
        }
      ];
      const SIMPLEX_OPERATOR_INDEX = Object.fromEntries(SIMPLEX_OPERATOR_SPECS.map(spec => [spec.key, spec]));
      const sampleProgram = `// Sample UNS program demonstrating const, +u, *s, lifts, windowed states, read
    let alpha = const(0.75)
    let beta = const(0.25)
    let probe = alpha +u (beta *s 2)
    let signal = lift1(sqrt, probe)
    let idx = lift1(index, const(0))
    let windowMask = lift1(windowWeight_3_4, idx)
    state psi = windowMask
    let guard = lift2(divide, probe +u const(0.1), signal)
    read(guard | psi)`;

      const DEFAULT_MICROSTATES = 512;
      const MAX_MICROSTATES = 32768;
      const MICROSTATE_STORAGE_KEY = 'uns_microstate_count';
      const DEFAULT_UNSE_FILENAME = 'program.unse';
      let currentFileName = DEFAULT_UNSE_FILENAME;

      const ui = {
        source: document.getElementById('unsSource'),
        output: document.getElementById('output'),
        status: document.getElementById('status'),
        ast: document.getElementById('astView'),
        debug: document.getElementById('debugLog'),
        valueTable: document.querySelector('#valueTable tbody'),
        readTester: document.getElementById('readTester'),
        readResult: document.getElementById('readResult'),
        microstateInput: document.getElementById('microstateCount'),
        highlightLayer: document.getElementById('highlightLayer'),
        cursorStatus: document.getElementById('cursorStatus'),
        layout: {
          workspace: document.getElementById('workspaceLayout'),
          resizer: document.getElementById('columnResizer')
        },
        examples: {
          select: document.getElementById('exampleSelect'),
          loadBtn: document.getElementById('loadExampleBtn')
        },
        inspectors: {
          panel: document.getElementById('inspectorPanel'),
          uvalueSelect: document.getElementById('inspectUValueSelect'),
          uvalueBtn: document.getElementById('inspectUValueBtn'),
          uvalueOutput: document.getElementById('inspectUValueOutput'),
          stateSelect: document.getElementById('inspectUStateSelect'),
          stateBtn: document.getElementById('inspectUStateBtn'),
          stateOutput: document.getElementById('inspectUStateOutput'),
          novelOutput: document.getElementById('novelInspector')
        },
        diagnostics: {
          log: document.getElementById('diagnosticLog'),
          empty: document.getElementById('diagnosticEmpty'),
          filters: document.querySelectorAll('[data-diagnostic-filter]'),
          clearBtn: document.getElementById('clearDiagnosticsBtn')
        },
        docs: {
          tree: document.getElementById('docTree'),
          search: document.getElementById('docSearch'),
          detailTitle: document.getElementById('docDetailTitle'),
          detailBody: document.getElementById('docDetailBody')
        },
        files: {
          saveBtn: document.getElementById('saveBtn'),
          loadBtn: document.getElementById('loadBtn'),
          input: document.getElementById('unseFileInput')
        },
        simplex: {
          panel: document.getElementById('simplexPanel'),
          select: document.getElementById('simplexOperatorSelect'),
          inputs: document.getElementById('simplexOperatorInputs'),
          runBtn: document.getElementById('runSimplexOperatorBtn'),
          result: document.getElementById('simplexOperatorResult'),
          hint: document.getElementById('simplexOperatorHint')
        }
      };

      const EXAMPLE_SCRIPTS = {
        smoothness: {
          label: 'Smoothness detection',
          code: `// Detect how smooth a hybrid window + sine signal is
let idx = lift1(index, const(0))
let carrier = lift1(windowWeight_96_48, idx)
let signal = carrier +u lift1(sin, idx)
let roughness = smoothness(signal)
printU(signal)
plotU(signal)`
        },
        primeScan: {
          label: 'Prime distribution analysis',
          code: `// Compare global vs windowed prime densities
let idx = lift1(index, const(0))
let primes = lift1(isPrime, idx)
state psi = psi_uniform()
let global = meanU(primes, psi)
let firstBand = mask_range(0, 128)
let firstBandDensity = meanU(primes *u firstBand, psi)
read(primes | psi)`
        },
        dTransform: {
          label: 'D-transform invariance',
          code: `// Show readout invariance after shifting psi
let idx = lift1(index, const(0))
let wave = lift1(sin, idx)
state psi = psi_uniform()
state shifted = D(48, psi)
let baseline = read(wave | psi)
let shiftedRead = read(wave | shifted)`
        },
        injectedDiff: {
          label: 'Injected diff pattern',
          code: `// Assemble sparse differences and spike a microstate
let diff = assemble {
  0: 0.2,
  1: 0.1,
  2: -0.2,
  3: 0.1,
  4: 0.1
}
let spike = inject(0.5, 32)
let combined = diff +u spike
plotU(combined)`
        },
        triangle: {
          label: 'Triangle hypotenuse',
          code: `// Compute sqrt(a^2 + b^2) per microstate
let idx = lift1(index, const(0))
let a = lift1(sin, idx)
let b = lift1(cos, idx)
let hypSquared = (a *u a) +u (b *u b)
let hyp = sqrtU(hypSquared)
plotU(hyp)`
        },
        novelDivision: {
          label: 'Division-by-zero novel',
          code: `// Surface a novel value produced by divide-by-zero
let zeros = collection(const(0))
let unstable = divU(const(1), zeros)
printU(unstable)`
        }
      };

      const DOC_TREE_DATA = [
        {
          id: 'language',
          title: 'Language Surface',
          summary: 'Keywords, lifts, and reserved identifiers.',
          children: [
            {
              id: 'language-core',
              title: 'Core keywords',
              summary: 'let, state, const, read, and boolean literals.',
              content: `
                <ul>
                  <li><code>let</code> introduces immutable bindings per microstate.</li>
                  <li><code>state</code> declares reusable <code>|psi|^2</code> distributions.</li>
                  <li><code>const</code> lifts scalars; <code>true</code>/<code>false</code> are predefined.</li>
                  <li><code>read(f | psi)</code> performs expectation-style aggregation.</li>
                  <li><code>lift1</code>/<code>lift2</code>/<code>D</code> expose helper entry points.</li>
                </ul>
              `
            },
            {
              id: 'language-helpers',
              title: 'Scalar helpers (lift1)',
              summary: 'Utility functions for building signals.',
              content: `
                <p><code>index</code> returns the microstate index, <code>isPrime</code> marks prime indices, and <code>windowWeight_CENTER_WIDTH</code> (for example <code>windowWeight_3_4</code>) emits tapered windows.</p>
              `
            },
            {
              id: 'language-lifts',
              title: 'Lift catalog',
              summary: 'Built-in unary and binary lifts.',
              content: `
                <ul>
                  <li><strong>lift1</strong>: <code>sqrt</code>, <code>sin</code>, <code>cos</code>, <code>log</code>, <code>abs</code>, <code>conj</code>, and all scalar helpers.</li>
                  <li><strong>lift2</strong>: <code>divide</code>, <code>pow</code>, <code>blend</code>, <code>lt</code>, <code>gt</code>, <code>eq</code>, <code>ge</code>, <code>le</code>.</li>
                  <li><strong>Special</strong>: <code>frac(a, b)</code> expands to <code>lift2(divide, a, b)</code>.</li>
                </ul>
              `
            },
            {
              id: 'language-reserved',
              title: 'Reserved identifiers',
              summary: 'Future-facing tokens.',
              content: `
                <p>The runtime reserves <code>novel</code>, <code>uvalue</code>, <code>ustate</code>, <code>scalar</code>, <code>fn</code>, and <code>type</code> for future extensions.</p>
              `
            }
          ]
        },
        {
          id: 'collections',
          title: 'Collections & Aggregates',
          summary: 'State builders, collections, and readout helpers.',
          children: [
            {
              id: 'collections-builders',
              title: 'Collections and injections',
              summary: 'Create sparse or dense signals.',
              content: `
                <p><code>assemble {i: value}</code>, <code>inject(value, index, M?)</code>, <code>collection(a0, a1, ...)</code>, and <code>uvalue_of({index: expr})</code> provide quick ways to seed signals before lifting.</p>
              `
            },
            {
              id: 'collections-states',
              title: 'States and masks',
              summary: 'Common |psi|^2 builders.',
              content: `
                <p><code>psi_uniform()</code>, <code>uniform_state()</code>, <code>state(uvalue)</code>, <code>delta_state(i)</code>, <code>state_range(start, end)</code>, and <code>mask_range(start, end)</code> cover most support shapes. <code>mask_threshold(f, t)</code> and comparison masks (<code>mask_lt</code>, <code>mask_gt</code>, <code>mask_eq</code>) refine regions.</p>
              `
            },
            {
              id: 'collections-aggregates',
              title: 'Aggregates via read()',
              summary: 'Expectation helpers.',
              content: `
                <p><code>read(f | psi)</code> plus helpers (<code>integrate</code>, <code>mean</code>, <code>variance</code>, <code>smoothness</code>) evaluate expectations without loops. <code>meanU</code>, <code>sumU</code>, <code>varianceU</code>, <code>stddevU</code>, and <code>smoothness</code> operate directly on UValues.</p>
              `
            },
            {
              id: 'collections-integrations',
              title: 'Integrations and densities',
              summary: 'Weighted statistics.',
              content: `
                <p><code>integrate(f, psi)</code> mirrors <code>read(f | psi)</code>; <code>mean(f)</code> defaults to <code>uniform_state()</code>. Combine <code>densityU</code>, <code>meanU</code>, and <code>varianceU</code> for weighted stats.</p>
              `
            },
            {
              id: 'collections-dtransform',
              title: 'D-transform workflows',
              summary: 'Symmetry exploration.',
              content: `
                <p><code>D(k, psi)</code> shifts amplitudes and preserves normalization, making it easy to compare <code>read</code> results before and after transforms.</p>
              `
            }
          ]
        },
        {
          id: 'diagnostics',
          title: 'Diagnostics & Debugging',
          summary: 'printU, plotU, and inspector guidance.',
          children: [
            {
              id: 'diagnostics-print',
              title: 'printU streams',
              summary: 'Emit per-microstate slices.',
              content: `
                <p><code>printU(value)</code> emits 128-sample slices of a UValue, preserving novel metadata so spikes are easy to trace.</p>
              `
            },
            {
              id: 'diagnostics-plot',
              title: 'plotU visualizations',
              summary: 'Inline magnitude charts.',
              content: `
                <p><code>plotU(value)</code> renders magnitudes for up to 512 samples. Pair with masks or helper states to visualize support.</p>
              `
            },
            {
              id: 'diagnostics-inspectors',
              title: 'Inspector hub tips',
              summary: 'Bindings, simplex, diagnostics.',
              content: `
                <p>The <strong>Bindings</strong> tab mirrors runtime bindings, <strong>Simplex Toolkit</strong> exposes helper operators, and <strong>Diagnostics</strong> aggregates <code>printU</code>/<code>plotU</code> events with copy-ready logs.</p>
              `
            }
          ]
        },
        {
          id: 'simplex',
          title: 'Simplex Operators',
          summary: 'Helper operators that preserve the UNS simplex.',
          children: [
            {
              id: 'simplex-overview',
              title: 'Operator overview',
              summary: 'Interactive helper descriptions.',
              content: `
                <ul>
                  <li><code>NORM(x)</code> rescales any nonnegative vector to the simplex (uniform fallback on zero).</li>
                  <li><code>MIX(u, v; alpha)</code> clamps <code>alpha</code> to [0,1] before mixing.</li>
                  <li><code>MERGE</code>/<code>SPLIT</code> convert between weighted families and standalone elements.</li>
                  <li><code>CANCEL</code>/<code>CANCEL_JOINT</code> remove shared support via <code>OVERLAP</code>.</li>
                  <li><code>MASK</code>/<code>PROJECT</code> restrict components and renormalize.</li>
                  <li><code>DOT</code> and <code>DIST_L1</code> remain in [0,1] and are read-only observables.</li>
                </ul>
              `
            }
          ]
        }
      ];

      if (ui.examples.select) {
        ui.examples.select.innerHTML = '';
        let firstKey = '';
        Object.entries(EXAMPLE_SCRIPTS).forEach(([key, script], index) => {
          const opt = document.createElement('option');
          opt.value = key;
          opt.textContent = script.label;
          ui.examples.select.appendChild(opt);
          if (index === 0) firstKey = key;
        });
        if (firstKey) ui.examples.select.value = firstKey;
      }

      if (ui.examples.loadBtn) {
        ui.examples.loadBtn.addEventListener('click', () => {
          if (!ui.examples.select) return;
          const selected = ui.examples.select.value;
          const script = EXAMPLE_SCRIPTS[selected];
          if (!script) return;
          ui.source.value = script.code;
          currentFileName = DEFAULT_UNSE_FILENAME;
          updateHighlight();
        });
      }

      if (ui.inspectors?.uvalueBtn) {
        ui.inspectors.uvalueBtn.addEventListener('click', () => {
          if (!currentVm) {
            if (ui.inspectors.uvalueOutput) ui.inspectors.uvalueOutput.textContent = 'Run a program first.';
            return;
          }
          const select = ui.inspectors.uvalueSelect;
          if (!select || select.disabled || !select.value) {
            if (ui.inspectors.uvalueOutput) ui.inspectors.uvalueOutput.textContent = 'No UValues available.';
            return;
          }
          const binding = currentVm.env.get(select.value);
          if (!binding || binding.kind !== 'uvalue') {
            if (ui.inspectors.uvalueOutput) ui.inspectors.uvalueOutput.textContent = 'Binding is not a UValue.';
            return;
          }
          if (ui.inspectors.uvalueOutput) ui.inspectors.uvalueOutput.textContent = formatUValueLines(currentVm, binding.ref);
        });
      }

      if (ui.inspectors?.stateBtn) {
        ui.inspectors.stateBtn.addEventListener('click', () => {
          if (!currentVm) {
            if (ui.inspectors.stateOutput) ui.inspectors.stateOutput.textContent = 'Run a program first.';
            return;
          }
          const select = ui.inspectors.stateSelect;
          if (!select || select.disabled || !select.value) {
            if (ui.inspectors.stateOutput) ui.inspectors.stateOutput.textContent = 'No UStates available.';
            return;
          }
          const binding = currentVm.env.get(select.value);
          if (!binding || binding.kind !== 'ustate') {
            if (ui.inspectors.stateOutput) ui.inspectors.stateOutput.textContent = 'Binding is not a UState.';
            return;
          }
          if (ui.inspectors.stateOutput) ui.inspectors.stateOutput.textContent = formatUStateLines(currentVm, binding.ref);
        });
      }

        setupCollapsibles();
        setupSimplexToolkit();
        setupResizer();
        setupFileIo();
        setupInspectorTabs();
        setupDocExplorer();
        diagnosticsController = createDiagnosticsController();

      function setupCollapsibles() {
        document.querySelectorAll('[data-collapsible]').forEach(section => {
          const button = section.querySelector('.collapse-btn');
          const body = section.querySelector('.panel-body');
          if (!button || !body) return;

          const setState = (expanded) => {
            button.setAttribute('aria-expanded', String(expanded));
            body.hidden = !expanded;
            button.textContent = expanded ? 'Collapse' : 'Expand';
          };

          setState(button.getAttribute('aria-expanded') !== 'false');

          button.addEventListener('click', () => {
            const expanded = button.getAttribute('aria-expanded') === 'true';
            setState(!expanded);
          });
        });
      }

      function setupSimplexToolkit() {
        const panel = ui.simplex;
        if (!panel?.select || !panel.inputs || !panel.runBtn || !panel.result) return;
        if (!panel.select.options.length) {
          SIMPLEX_OPERATOR_SPECS.forEach(spec => {
            const option = document.createElement('option');
            option.value = spec.key;
            option.textContent = spec.label;
            panel.select.appendChild(option);
          });
        }

        if (!panel.select.value && SIMPLEX_OPERATOR_SPECS.length) {
          panel.select.value = SIMPLEX_OPERATOR_SPECS[0].key;
        }

        let activeSpec = null;
        let activeControls = {};

        const renderInputs = () => {
          activeControls = {};
          panel.inputs.innerHTML = '';
          activeSpec = SIMPLEX_OPERATOR_INDEX[panel.select.value] ?? null;
          if (!activeSpec) return;
          activeSpec.args.forEach(arg => {
            const field = document.createElement('div');
            field.className = 'simplex-field';
            const label = document.createElement('label');
            label.textContent = arg.label;
            const input = createSimplexInput(arg);
            field.appendChild(label);
            field.appendChild(input);
            panel.inputs.appendChild(field);
            activeControls[arg.key] = input;
          });
          if (panel.hint) {
            panel.hint.textContent = activeSpec.description;
          }
          panel.result.textContent = 'Ready. Provide inputs and run the helper.';
        };

        const gatherArgs = () => {
          if (!activeSpec) return {};
          const values = {};
          activeSpec.args.forEach(arg => {
            const control = activeControls[arg.key];
            if (!control) return;
            const raw = control.value.trim();
            if (!raw) {
              if (arg.optional) {
                values[arg.key] = undefined;
                return;
              }
              throw new Error(`${arg.label} is required`);
            }
            values[arg.key] = parseSimplexArg(raw, arg.type, arg.label);
          });
          return values;
        };

        panel.select.addEventListener('change', renderInputs);
        renderInputs();

        panel.runBtn.addEventListener('click', () => {
          if (!activeSpec) return;
          try {
            const args = gatherArgs();
            const output = activeSpec.run(args);
            panel.result.textContent = formatSimplexResult(output);
          } catch (err) {
            panel.result.textContent = `Error: ${err.message}`;
          }
        });
      }

      function createSimplexInput(arg) {
        if (arg.type === 'alpha') {
          const input = document.createElement('input');
          input.type = 'number';
          input.step = '0.01';
          input.min = '0';
          input.max = '1';
          input.placeholder = arg.placeholder ?? '0.5';
          input.value = arg.defaultValue ?? '';
          return input;
        }
        const textarea = document.createElement('textarea');
        textarea.placeholder = arg.placeholder ?? '[0.25, 0.25, 0.5]';
        textarea.value = arg.defaultValue ?? '';
        textarea.rows = arg.rows ?? 3;
        return textarea;
      }

      function parseSimplexArg(raw, type, label) {
        switch (type) {
          case 'vector':
          case 'mask':
            return parseVector(raw, label);
          case 'vectors':
            return parseVectorList(raw, label);
          case 'numberArray':
          case 'coefficients':
            return parseNumberArray(raw, label);
          case 'subset':
            return parseSubset(raw, label);
          case 'alpha':
            return parseAlpha(raw, label);
          default:
            return raw;
        }
      }

      function parseVector(raw, label) {
        const parsed = safeJsonParse(raw, label);
        if (!Array.isArray(parsed) || !parsed.length) {
          throw new Error(`${label} must be a JSON array of numbers`);
        }
        return parsed.map((value, idx) => toFiniteNumber(value, `${label}[${idx}]`));
      }

      function parseVectorList(raw, label) {
        const parsed = safeJsonParse(raw, label);
        if (!Array.isArray(parsed) || !parsed.length) {
          throw new Error(`${label} must be an array of vectors`);
        }
        return parsed.map((vec, idx) => {
          if (!Array.isArray(vec) || !vec.length) {
            throw new Error(`${label}[${idx}] must be a non-empty array`);
          }
          return vec.map((value, j) => toFiniteNumber(value, `${label}[${idx}][${j}]`));
        });
      }

      function parseNumberArray(raw, label) {
        const parsed = safeJsonParse(raw, label);
        if (!Array.isArray(parsed) || !parsed.length) {
          throw new Error(`${label} must be a JSON array of numbers`);
        }
        return parsed.map((value, idx) => toFiniteNumber(value, `${label}[${idx}]`));
      }

      function parseSubset(raw, label) {
        const parsed = parseNumberArray(raw, label);
        return parsed.map((value, idx) => {
          const intVal = Math.trunc(value);
          if (intVal < 0) throw new Error(`${label}[${idx}] must be >= 0`);
          return intVal;
        });
      }

      function parseAlpha(raw, label) {
        const num = toFiniteNumber(raw, label);
        return num;
      }

      function safeJsonParse(raw, label) {
        try {
          return JSON.parse(raw);
        } catch (err) {
          throw new Error(`${label} must be valid JSON`);
        }
      }

      function toFiniteNumber(value, label) {
        const num = Number(value);
        if (!Number.isFinite(num)) {
          throw new Error(`${label} must be a finite number`);
        }
        return num;
      }

      function formatSimplexResult(value) {
        if (typeof value === 'number') {
          return Number.isFinite(value) ? value.toPrecision(6) : String(value);
        }
        if (Array.isArray(value)) {
          return JSON.stringify(value, null, 2);
        }
        if (value && typeof value === 'object') {
          return JSON.stringify(value, null, 2);
        }
        return String(value ?? '');
      }

      function setupResizer() {
        const workspace = ui.layout?.workspace;
        const resizer = ui.layout?.resizer;
        if (!workspace || !resizer) return;
        const minLeft = 320;
        const minRight = 280;
        let active = false;

        const handleMove = (event) => {
          if (!active) return;
          const rect = workspace.getBoundingClientRect();
          let newLeft = event.clientX - rect.left;
          const maxLeft = rect.width - minRight;
          newLeft = Math.max(minLeft, Math.min(maxLeft, newLeft));
          const percent = (newLeft / rect.width) * 100;
          workspace.style.setProperty('--left-col', `${percent}%`);
        };

        const stopResize = (event) => {
          if (!active) return;
          active = false;
          resizer.classList.remove('dragging');
          if (event.pointerId !== undefined && resizer.hasPointerCapture(event.pointerId)) {
            resizer.releasePointerCapture(event.pointerId);
          }
          document.removeEventListener('pointermove', handleMove);
          document.removeEventListener('pointerup', stopResize);
          document.removeEventListener('pointercancel', stopResize);
        };

        resizer.addEventListener('pointerdown', (event) => {
          event.preventDefault();
          active = true;
          resizer.classList.add('dragging');
          resizer.setPointerCapture(event.pointerId);
          document.addEventListener('pointermove', handleMove);
          document.addEventListener('pointerup', stopResize);
          document.addEventListener('pointercancel', stopResize);
        });
      }

      function setupFileIo() {
        const controls = ui.files;
        if (!controls?.saveBtn || !controls.loadBtn || !controls.input) return;
        controls.saveBtn.addEventListener('click', downloadCurrentProgram);
        controls.loadBtn.addEventListener('click', () => {
          controls.input.value = '';
          controls.input.click();
        });
        controls.input.addEventListener('change', handleFileSelection);
      }

      function setupInspectorTabs() {
        const tabs = Array.from(document.querySelectorAll('[data-inspector-tab]'));
        if (!tabs.length) return;
        const panels = new Map();
        tabs.forEach((tab) => {
          const id = tab.dataset.inspectorTab;
          const controlsId = tab.getAttribute('aria-controls');
          if (!id || !controlsId) return;
          const panel = document.getElementById(controlsId);
          if (panel) panels.set(id, panel);
        });
        if (!panels.size) return;
        let activeId = storage?.getItem(INSPECTOR_TAB_STORAGE_KEY) ?? tabs[0].dataset.inspectorTab;
        if (!activeId || !panels.has(activeId)) {
          activeId = tabs[0].dataset.inspectorTab;
        }
        const activate = (id) => {
          if (!id || !panels.has(id)) return;
          tabs.forEach((tab) => {
            const isActive = tab.dataset.inspectorTab === id;
            tab.setAttribute('aria-selected', String(isActive));
          });
          panels.forEach((panel, key) => {
            panel.hidden = key !== id;
          });
          if (storage) storage.setItem(INSPECTOR_TAB_STORAGE_KEY, id);
        };
        tabs.forEach((tab) => {
          tab.addEventListener('click', () => activate(tab.dataset.inspectorTab));
        });
        activate(activeId);
      }

      function setupDocExplorer() {
        const docsUi = ui.docs;
        if (!docsUi?.tree || !DOC_TREE_DATA.length) return;
        const expanded = new Set();
        if (storage) {
          try {
            const raw = JSON.parse(storage.getItem(DOC_EXPANDED_STORAGE_KEY) ?? '[]');
            if (Array.isArray(raw)) {
              raw.forEach((id) => {
                if (typeof id === 'string') expanded.add(id);
              });
            }
          } catch (err) {
            expanded.clear();
          }
        }
        const docIndex = new Map();
        (function indexNodes(nodes) {
          nodes.forEach((node) => {
            docIndex.set(node.id, node);
            if (node.children?.length) indexNodes(node.children);
          });
        })(DOC_TREE_DATA);
        const defaultNode = findFirstDocNode(DOC_TREE_DATA);
        let selectedId = storage?.getItem(DOC_SELECTED_STORAGE_KEY);
        let filterDisplay = docsUi.search ? docsUi.search.value.trim() : '';
        let filterValue = filterDisplay.toLowerCase();

        const persistExpanded = () => {
          if (!storage) return;
          storage.setItem(DOC_EXPANDED_STORAGE_KEY, JSON.stringify(Array.from(expanded)));
        };

        const persistSelection = () => {
          if (!storage || !selectedId) return;
          storage.setItem(DOC_SELECTED_STORAGE_KEY, selectedId);
        };

        if (!selectedId || !docIndex.has(selectedId)) {
          selectedId = defaultNode?.id ?? DOC_TREE_DATA[0]?.id ?? null;
          persistSelection();
        }

        const updateDetail = () => {
          if (!docsUi.detailTitle || !docsUi.detailBody) return;
          const node = docIndex.get(selectedId) ?? defaultNode;
          if (!node) return;
          docsUi.detailTitle.textContent = node.title;
          if (node.content) {
            docsUi.detailBody.innerHTML = node.content.trim();
          } else if (node.summary) {
            docsUi.detailBody.textContent = node.summary;
          } else {
            docsUi.detailBody.textContent = 'Documentation coming soon.';
          }
        };

        const selectNode = (id) => {
          if (!id || !docIndex.has(id)) return;
          selectedId = id;
          persistSelection();
          updateDetail();
          renderTree();
        };

        const renderTree = () => {
          if (!docsUi.tree) return;
          const filtered = filterValue ? filterDocNodes(DOC_TREE_DATA, filterValue) : DOC_TREE_DATA;
          docsUi.tree.innerHTML = '';
          if (!filtered.length) {
            const empty = document.createElement('div');
            empty.className = 'doc-empty';
            empty.textContent = `No topics match "${filterDisplay}".`;
            docsUi.tree.appendChild(empty);
            if (docsUi.detailTitle) docsUi.detailTitle.textContent = 'No results';
            if (docsUi.detailBody) docsUi.detailBody.textContent = 'Try adjusting your query to load documentation.';
            return;
          }
          const visibleIds = new Set();
          (function collectIds(nodes) {
            nodes.forEach((node) => {
              visibleIds.add(node.id);
              if (node.children?.length) collectIds(node.children);
            });
          })(filtered);
          if (selectedId && !visibleIds.has(selectedId)) {
            selectedId = filtered[0]?.id ?? null;
            persistSelection();
            updateDetail();
          }
          const fragment = document.createDocumentFragment();
          filtered.forEach((node) => fragment.appendChild(renderNode(node, 0)));
          docsUi.tree.appendChild(fragment);
        };

        const renderNode = (node, depth) => {
          const fragment = document.createDocumentFragment();
          const row = document.createElement('div');
          row.className = 'doc-node';
          row.style.setProperty('--depth', depth);
          row.setAttribute('role', 'treeitem');
          row.setAttribute('aria-level', String(depth + 1));
          const hasChildren = Boolean(node.children?.length);
          const forcedOpen = Boolean(filterValue && hasChildren);
          const isExpanded = forcedOpen || expanded.has(node.id);
          if (hasChildren) {
            row.setAttribute('aria-expanded', String(isExpanded));
          } else {
            row.removeAttribute('aria-expanded');
          }
          const toggle = document.createElement('button');
          toggle.type = 'button';
          toggle.className = 'doc-node-toggle';
          toggle.disabled = !hasChildren || forcedOpen;
          toggle.textContent = isExpanded ? 'v' : '>';
          toggle.setAttribute('aria-expanded', String(isExpanded));
          if (hasChildren && !forcedOpen) {
            toggle.addEventListener('click', () => {
              if (expanded.has(node.id)) expanded.delete(node.id);
              else expanded.add(node.id);
              persistExpanded();
              renderTree();
            });
          }
          const label = document.createElement('button');
          label.type = 'button';
          label.className = 'doc-node-label';
          label.textContent = node.title;
          if (node.summary) label.title = node.summary;
          label.setAttribute('aria-current', selectedId === node.id ? 'true' : 'false');
          label.addEventListener('click', () => selectNode(node.id));
          row.appendChild(toggle);
          row.appendChild(label);
          fragment.appendChild(row);
          if (hasChildren && isExpanded) {
            node.children.forEach((child) => fragment.appendChild(renderNode(child, depth + 1)));
          }
          return fragment;
        };

        if (docsUi.search) {
          docsUi.search.addEventListener('input', (event) => {
            const value = event.currentTarget.value ?? '';
            filterDisplay = value.trim();
            filterValue = filterDisplay.toLowerCase();
            renderTree();
          });
        }

        updateDetail();
        renderTree();
      }

      function findFirstDocNode(nodes) {
        for (const node of nodes) {
          if (node.content) return node;
          if (node.children?.length) {
            const child = findFirstDocNode(node.children);
            if (child) return child;
          }
        }
        return null;
      }

      function filterDocNodes(nodes, query) {
        const normalized = (query ?? '').toLowerCase();
        if (!normalized) return nodes;
        const results = [];
        nodes.forEach((node) => {
          const children = filterDocNodes(node.children ?? [], query);
          if (docNodeMatches(node, normalized) || children.length) {
            results.push({ ...node, children });
          }
        });
        return results;
      }

      function docNodeMatches(node, normalized) {
        if (!normalized) return true;
        const haystack = `${node.title} ${node.summary ?? ''} ${stripHtmlTags(node.content ?? '')}`.toLowerCase();
        return haystack.includes(normalized);
      }

      function createDiagnosticsController() {
        const diagnosticsUi = ui.diagnostics;
        if (!diagnosticsUi?.log) {
          return {
            recordPrint() {},
            recordPlot() {},
            reset() {}
          };
        }
        const state = {
          entries: [],
          filter: 'all',
          nextId: 1
        };
        const log = diagnosticsUi.log;
        const empty = diagnosticsUi.empty;
        const filters = Array.from(diagnosticsUi.filters ?? []);
        const clearBtn = diagnosticsUi.clearBtn;
        const availableFilters = filters.length ? new Set(filters.map((btn) => btn.dataset.diagnosticFilter)) : new Set(['all', 'print', 'plot']);
        const savedFilter = storage?.getItem(DIAGNOSTIC_FILTER_STORAGE_KEY);
        if (savedFilter && availableFilters.has(savedFilter)) {
          state.filter = savedFilter;
        }

        const setFilter = (value) => {
          const next = value && availableFilters.has(value) ? value : 'all';
          state.filter = next;
          filters.forEach((btn) => {
            const isActive = btn.dataset.diagnosticFilter === next;
            btn.setAttribute('aria-pressed', String(isActive));
          });
          if (storage) storage.setItem(DIAGNOSTIC_FILTER_STORAGE_KEY, next);
          render();
        };

        filters.forEach((btn) => {
          btn.addEventListener('click', () => setFilter(btn.dataset.diagnosticFilter));
        });

        if (clearBtn) {
          clearBtn.addEventListener('click', () => {
            state.entries = [];
            render();
          });
        }

        setFilter(state.filter);

        function addEntry(entry) {
          entry.id = state.nextId++;
          entry.timestamp = Date.now();
          state.entries.push(entry);
          if (state.entries.length > MAX_DIAGNOSTIC_EVENTS) {
            state.entries.shift();
          }
          render();
        }

        function recordPrint(payload) {
          if (!payload) return;
          addEntry({ type: 'print', text: payload.trim() });
        }

        function recordPlot(series) {
          if (!Array.isArray(series) || !series.length) return;
          const trimmed = series.slice(0, 512);
          addEntry({ type: 'plot', series: trimmed, stats: summarizeSeries(trimmed) });
        }

        function summarizeSeries(values) {
          const stats = { min: Infinity, max: -Infinity, count: values.length };
          values.forEach((value) => {
            stats.min = Math.min(stats.min, value);
            stats.max = Math.max(stats.max, value);
          });
          stats.min = Number.isFinite(stats.min) ? stats.min : 0;
          stats.max = Number.isFinite(stats.max) ? stats.max : 0;
          return stats;
        }

        function render() {
          if (!log) return;
          const visible = state.entries.filter((entry) => state.filter === 'all' || entry.type === state.filter);
          log.innerHTML = '';
          if (!visible.length) {
            log.hidden = true;
            if (empty) empty.hidden = false;
            return;
          }
          log.hidden = false;
          if (empty) empty.hidden = true;
          const fragment = document.createDocumentFragment();
          visible.forEach((entry) => fragment.appendChild(renderEntry(entry)));
          log.appendChild(fragment);
        }

        function renderEntry(entry) {
          const card = document.createElement('article');
          card.className = `diagnostic-entry type-${entry.type}`;
          const header = document.createElement('header');
          const label = document.createElement('span');
          label.textContent = entry.type === 'print' ? 'printU' : 'plotU';
          const time = document.createElement('span');
          time.textContent = new Date(entry.timestamp).toLocaleTimeString([], { hour12: false });
          header.appendChild(label);
          header.appendChild(time);
          card.appendChild(header);
          if (entry.type === 'print') {
            const pre = document.createElement('pre');
            pre.textContent = entry.text;
            card.appendChild(pre);
            card.appendChild(buildMeta(`Lines ${entry.text.split(/\n/).length}`));
          } else if (entry.type === 'plot') {
            card.appendChild(buildPlot(entry.series));
            card.appendChild(buildMeta(`Samples ${entry.stats.count} | min ${entry.stats.min.toFixed(4)} | max ${entry.stats.max.toFixed(4)}`));
          }
          card.appendChild(buildActions(entry));
          return card;
        }

        function buildMeta(text) {
          const meta = document.createElement('div');
          meta.className = 'diagnostic-meta';
          meta.textContent = text;
          return meta;
        }

        function buildActions(entry) {
          const wrap = document.createElement('div');
          wrap.className = 'diagnostic-actions';
          const copyBtn = document.createElement('button');
          copyBtn.type = 'button';
          copyBtn.textContent = 'Copy';
          copyBtn.addEventListener('click', () => {
            const payload = entry.type === 'print' ? entry.text : JSON.stringify(entry.series);
            copyToClipboard(payload);
          });
          wrap.appendChild(copyBtn);
          return wrap;
        }

        function buildPlot(series) {
          const svg = document.createElementNS(SVG_NS, 'svg');
          svg.setAttribute('viewBox', '0 0 360 100');
          svg.setAttribute('preserveAspectRatio', 'none');
          if (!series.length) return svg;
          const max = series.reduce((acc, value) => Math.max(acc, Math.abs(value)), 0) || 1;
          const span = series.length === 1 ? 0 : 344 / (series.length - 1);
          let pathData = '';
          series.forEach((value, idx) => {
            const x = 8 + idx * span;
            const normalized = Math.abs(value) / max;
            const y = 92 - normalized * 84;
            pathData += `${idx === 0 ? 'M' : 'L'}${x.toFixed(2)} ${y.toFixed(2)} `;
          });
          const path = document.createElementNS(SVG_NS, 'path');
          path.setAttribute('d', pathData.trim());
          path.setAttribute('fill', 'none');
          path.setAttribute('stroke', '#7dd7ff');
          path.setAttribute('stroke-width', '2');
          path.setAttribute('stroke-linejoin', 'round');
          path.setAttribute('stroke-linecap', 'round');
          svg.appendChild(path);
          return svg;
        }

        return {
          recordPrint,
          recordPlot,
          reset() {
            state.entries = [];
            render();
          }
        };
      }

      function normalizeFilename(name) {
        const trimmed = (name ?? '').trim();
        const base = trimmed || DEFAULT_UNSE_FILENAME;
        return base.toLowerCase().endsWith('.unse') ? base : `${base}.unse`;
      }

      function downloadCurrentProgram() {
        const content = ui.source?.value ?? '';
        const filename = normalizeFilename(currentFileName);
        const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = filename;
        document.body.appendChild(anchor);
        anchor.click();
        document.body.removeChild(anchor);
        setTimeout(() => URL.revokeObjectURL(url), 0);
        if (ui.status) ui.status.textContent = `Saved ${filename}`;
      }

      function handleFileSelection(event) {
        const input = event.currentTarget instanceof HTMLInputElement ? event.currentTarget : null;
        const file = input?.files && input.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
          const text = typeof reader.result === 'string' ? reader.result : '';
          ui.source.value = text;
          updateHighlight();
          currentFileName = file.name || DEFAULT_UNSE_FILENAME;
          if (ui.status) ui.status.textContent = `Loaded ${currentFileName}`;
          if (input) input.value = '';
        };
        reader.onerror = () => {
          if (ui.status) ui.status.textContent = `Failed to load ${file.name ?? 'file'}: ${reader.error?.message ?? 'Unknown error'}`;
          if (input) input.value = '';
        };
        reader.readAsText(file);
      }

      document.getElementById('sampleBtn').addEventListener('click', () => {
        ui.source.value = sampleProgram;
        currentFileName = DEFAULT_UNSE_FILENAME;
        updateHighlight();
      });

      document.getElementById('clearBtn').addEventListener('click', () => {
        ui.source.value = '';
        ui.output.textContent = 'Cleared.';
        ui.status.textContent = '';
        ui.ast.textContent = '// AST will appear here';
        ui.debug.textContent = '// logs will appear here';
        ui.valueTable.innerHTML = '';
        ui.readTester.innerHTML = '';
        ui.readResult.textContent = '';
        currentVm = null;
        currentFileName = DEFAULT_UNSE_FILENAME;
        resetInspectors();
        resetDiagnostics();
        updateHighlight();
      });

      document.getElementById('runBtn').addEventListener('click', () => {
        const value = getConfiguredMicrostates();
        persistMicrostatePreference(value);
        execute(ui.source.value);
      });

      let currentVm = null;
      ui.source.addEventListener('input', updateHighlight);
      ui.source.addEventListener('scroll', syncScroll);
      ui.source.addEventListener('click', updateCursorStatus);
      ui.source.addEventListener('keyup', updateCursorStatus);
      ui.source.addEventListener('mouseup', updateCursorStatus);

      const storage = (() => {
        try {
          return window.localStorage;
        } catch (err) {
          return null;
        }
      })();

      let diagnosticsController = null;

      function clampMicrostateCount(value) {
        if (!Number.isFinite(value)) return DEFAULT_MICROSTATES;
        return Math.min(MAX_MICROSTATES, Math.max(1, Math.floor(value)));
      }

      function clampUnitInterval(value) {
        if (!Number.isFinite(value)) return 0;
        if (value <= 0) return 0;
        if (value >= 1) return 1;
        return value;
      }

      function loadMicrostatePreference() {
        if (!storage) return DEFAULT_MICROSTATES;
        const raw = parseInt(storage.getItem(MICROSTATE_STORAGE_KEY) ?? '', 10);
        if (!Number.isFinite(raw)) return DEFAULT_MICROSTATES;
        return clampMicrostateCount(raw);
      }

      function persistMicrostatePreference(value) {
        if (storage) storage.setItem(MICROSTATE_STORAGE_KEY, String(value));
      }

      function getConfiguredMicrostates() {
        if (!ui.microstateInput) return DEFAULT_MICROSTATES;
        const parsed = parseInt(ui.microstateInput.value, 10);
        const clamped = clampMicrostateCount(Number.isFinite(parsed) ? parsed : DEFAULT_MICROSTATES);
        ui.microstateInput.value = clamped;
        return clamped;
      }

      const initialMicrostates = loadMicrostatePreference();
      if (ui.microstateInput) {
        ui.microstateInput.value = initialMicrostates;
        ui.microstateInput.addEventListener('change', () => {
          const value = getConfiguredMicrostates();
          persistMicrostatePreference(value);
        });
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

      function escapeHtml(str) {
        return str
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;');
      }

      function stripHtmlTags(html) {
        if (!html) return '';
        return html.replace(/<[^>]*>/g, ' ');
      }

      function copyToClipboard(text) {
        if (!text) return;
        if (navigator?.clipboard?.writeText) {
          navigator.clipboard.writeText(text).catch(() => fallbackCopy(text));
          return;
        }
        fallbackCopy(text);
      }

      function fallbackCopy(text) {
        const temp = document.createElement('textarea');
        temp.value = text;
        temp.style.position = 'fixed';
        temp.style.left = '-9999px';
        temp.style.opacity = '0';
        document.body.appendChild(temp);
        temp.focus();
        temp.select();
        try {
          document.execCommand('copy');
        } catch (err) {
          console.warn('Copy failed', err);
        }
        document.body.removeChild(temp);
      }

      function syntaxHighlight(text) {
        let html = '';
        let i = 0;
        const len = text.length;
        const push = (cls, value) => {
          const escaped = escapeHtml(value);
          html += cls ? `<span class="token-${cls}">${escaped}</span>` : escaped;
        };

        while (i < len) {
          const ch = text[i];
          const next = text[i + 1];

          if (ch === '\r') {
            i += 1;
            continue;
          }

          if (ch === '\n') {
            html += '\n';
            i += 1;
            continue;
          }

          if (ch === '/' && next === '/') {
            const start = i;
            i += 2;
            while (i < len && text[i] !== '\n') i += 1;
            push('comment', text.slice(start, i));
            continue;
          }

          if (ch === '/' && next === '*') {
            const start = i;
            i += 2;
            while (i < len && !(text[i] === '*' && text[i + 1] === '/')) i += 1;
            if (i < len) i += 2;
            push('comment', text.slice(start, i));
            continue;
          }

          if ((ch === '-' && /[0-9]/.test(next)) || /[0-9]/.test(ch)) {
            const start = i;
            i += 1;
            while (i < len && /[0-9]/.test(text[i])) i += 1;
            if (text[i] === '.' && /[0-9]/.test(text[i + 1])) {
              i += 1;
              while (i < len && /[0-9]/.test(text[i])) i += 1;
            }
            if (text[i] === 'i') i += 1;
            push('number', text.slice(start, i));
            continue;
          }

          if ((ch === '+' || ch === '*') && next === 'u') {
            push('operator', text.slice(i, i + 2));
            i += 2;
            continue;
          }

          if (ch === '*' && next === 's') {
            push('operator', text.slice(i, i + 2));
            i += 2;
            continue;
          }

          if ('=|,(){}:'.includes(ch)) {
            push('operator', ch);
            i += 1;
            continue;
          }

          if (/[A-Za-z_]/.test(ch)) {
            const start = i;
            i += 1;
            while (i < len && /[A-Za-z0-9_]/.test(text[i])) i += 1;
            const word = text.slice(start, i);
            const lowerWord = word.toLowerCase();
            const isKeyword = KEYWORD_LOOKUP.has(lowerWord);
            const isReserved = RESERVED_LOOKUP.has(lowerWord);
            const isSpecial = SPECIAL_IDENTIFIERS.has(lowerWord);
            const isHelper = Boolean(canonicalHelperName(word));
            const cls = (isKeyword || isReserved || isSpecial || isHelper) ? 'keyword' : 'identifier';
            push(cls, word);
            continue;
          }

          push(null, ch);
          i += 1;
        }

        return html || '&nbsp;';
      }

      let scrollSyncPending = false;

      function applyScrollSync() {
        if (!ui.highlightLayer) return;
        ui.highlightLayer.scrollTop = ui.source.scrollTop;
        ui.highlightLayer.scrollLeft = ui.source.scrollLeft;
      }

      function syncScroll() {
        if (scrollSyncPending) return;
        scrollSyncPending = true;
        requestAnimationFrame(() => {
          scrollSyncPending = false;
          applyScrollSync();
        });
      }

      function updateCursorStatus() {
        if (!ui.cursorStatus || !ui.source) return;
        const pos = ui.source.selectionStart ?? 0;
        const text = ui.source.value ?? '';
        let line = 1;
        let column = 1;
        for (let i = 0; i < pos; i++) {
          if (text[i] === '\n') {
            line += 1;
            column = 1;
          } else {
            column += 1;
          }
        }
        ui.cursorStatus.textContent = `Line ${line}, Col ${column}`;
      }

      function updateHighlight() {
        if (!ui.highlightLayer) return;
        const text = ui.source.value ?? '';
        ui.highlightLayer.innerHTML = syntaxHighlight(text);
        const wrapper = ui.highlightLayer.parentElement;
        if (wrapper) {
          wrapper.dataset.empty = text.length ? 'false' : 'true';
          wrapper.dataset.placeholder = ui.source.placeholder || '';
        }
        applyScrollSync();
        updateCursorStatus();
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

        const peek = (offset = 0) => source[i + offset];

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
              for (let k = 0; k < consumed; k++) advance();
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
            const lowerIdent = ident.toLowerCase();
            const keywordValue = KEYWORD_LOOKUP.get(lowerIdent);
            if (keywordValue) {
              emit('keyword', keywordValue);
            } else {
              const reservedValue = RESERVED_LOOKUP.get(lowerIdent);
              if (reservedValue) {
                emit('reserved', reservedValue);
              } else {
                emit('identifier', ident);
              }
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
          if (expected === 'scalar') {
            if (type === 'scalar') return 'scalar';
            if (type === 'uvalue') {
              this.emit('UVALUE_TO_SCALAR');
              return 'scalar';
            }
            throw new Error(`${label} expects scalar but received ${describeTypeName(type)}`);
          }
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
              const elements = Array.isArray(node.elements) ? node.elements : [];
              if (!elements.length) throw new Error('Tuple literal requires at least one element');
              const elementTypes = elements.map((element) => this.emitExpr(element));
              this.emit('BUILD_TUPLE', elements.length);
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
              for (let i = 0; i < optionalSpan; i++) expectedTypes.push(optionalArgs[i]);
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
            for (let i = arr.length; i < desired; i++) arr[i] = filler();
          });
          this.heap.states.forEach((arr) => {
            for (let i = arr.length; i < desired; i++) arr[i] = filler();
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
          for (let i = 0; i < this.M; i++) {
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
          for (let i = 0; i < this.M; i++) {
            const magnitude = Math.max(0, decodeReal(magnitudeSquared(values[i])));
            vector[i] = magnitude;
          }
          return vector;
        }

        simplexToUValue(vector) {
          const arr = new Array(this.M);
          for (let i = 0; i < this.M; i++) {
            const value = Number.isFinite(vector[i]) ? vector[i] : 0;
            arr[i] = { real: encodeReal(value), imag: 0 };
          }
          const ref = this.allocateUValue(arr);
          return { kind: 'uvalue', ref };
        }

        extractConstantScalarValue(ref, label = 'value') {
          const values = this.heap.values[ref];
          if (!Array.isArray(values) || !values.length) {
            throw new Error(`${label} requires a non-empty UValue to coerce into a scalar.`);
          }
          const baseline = values[0] ?? { real: 0, imag: 0 };
          if (baseline.novelId) {
            throw new Error(`${label} cannot be derived from a novel value.`);
          }
          for (let i = 1; i < Math.min(values.length, this.M); i++) {
            const sample = values[i] ?? baseline;
            if (sample.novelId) {
              throw new Error(`${label} cannot be derived from a novel value.`);
            }
            if (sample.real !== baseline.real || sample.imag !== baseline.imag) {
              throw new Error(`${label} expects a constant UValue when converting to scalar.`);
            }
          }
          return baseline;
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
            for (let i = 0; i < this.M; i++) {
              state[i] = { real: uniform, imag: 0 };
            }
            return;
          }
          const scale = encodeReal(1 / Math.sqrt(decoded));
          for (let i = 0; i < this.M; i++) {
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
          if (!value) throw new Error(`${label} expects a scalar`);
          if (value.kind === 'scalar') {
            if (value.novelId != null) {
              throw new Error(`${label} cannot be derived from a novel value.`);
            }
            return decodeReal(value.data.real);
          }
          if (value.kind === 'uvalue') {
            const scalar = this.extractConstantScalarValue(value.ref, label);
            return decodeReal(scalar.real);
          }
          throw new Error(`${label} expects a scalar but received ${value.kind}`);
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
          for (let i = 0; i < this.M; i++) {
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
          for (let i = 0; i < this.M; i++) {
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
          for (let i = 0; i < this.M; i++) {
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
          for (let i = 0; i < this.M; i++) {
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
          for (let i = 0; i < this.M; i++) {
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
          for (let i = 0; i < limit; i++) {
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
          for (let i = 0; i < this.M; i++) {
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
          for (let i = 0; i < this.M; i++) {
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
          for (let i = 0; i < this.M; i++) {
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
          for (let i = 0; i < this.M; i++) {
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
          for (let i = 0; i < this.M; i++) {
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
          for (let i = 0; i < this.M; i++) {
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

        formatUValueSlice(ref, limit = 96) {
          const arr = this.heap.values[ref] ?? [];
          if (!arr.length) return 'No microstates available.';
          const lines = [];
          const span = Math.min(arr.length, limit);
          for (let i = 0; i < span; i++) {
            const sample = arr[i] ?? { real: 0, imag: 0 };
            const { re, im } = complexToFloat(sample);
            const novel = sample.novelId ? ` novel#${sample.novelId}` : '';
            lines.push(`${i.toString().padStart(4, '0')}: ${re.toFixed(4)} + ${im.toFixed(4)}i${novel}`);
          }
          if (span < arr.length) lines.push(`... truncated ${arr.length - span} rows`);
          return lines.join('\n');
        }

        extractMagnitudeSeries(ref, limit = 512) {
          const arr = this.heap.values[ref] ?? [];
          const span = Math.min(arr.length, limit);
          const series = new Array(span);
          for (let i = 0; i < span; i++) {
            const sample = arr[i] ?? { real: 0, imag: 0 };
            const magnitude = Math.sqrt(Math.max(0, decodeReal(magnitudeSquared(sample))));
            series[i] = magnitude;
          }
          return series;
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
          for (let i = 0; i < this.M; i++) {
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
          for (let i = 0; i < this.M; i++) {
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
          for (let i = 0; i < this.M; i++) {
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
            case 'collection':
              return this.buildCollection(args);
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
                this.diagnostics.print(this.formatUValueSlice(value.ref, 128));
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
              for (let i = 0; i < this.M; i++) {
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
                if (value.kind !== 'uvalue') throw new Error(`UVALUE_TO_STATE expected UValue but received ${value.kind}`);
                const arr = this.heap.values[value.ref].map(cloneComplex);
                const ref = this.allocateUState(arr);
                this.normalizeState(ref);
                this.push({ kind: 'ustate', ref });
                break;
              }
              case 'UVALUE_TO_SCALAR': {
                const value = this.pop();
                if (value.kind !== 'uvalue') throw new Error(`UVALUE_TO_SCALAR expected UValue but received ${value.kind}`);
                const scalar = this.extractConstantScalarValue(value.ref, 'UVALUE_TO_SCALAR');
                this.push({ kind: 'scalar', data: { real: scalar.real, imag: scalar.imag } });
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
                for (let i = 0; i < this.M; i++) {
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
                for (let i = 0; i < this.M; i++) {
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
                let scalar, uval;
                if (first.kind === 'scalar' && second.kind === 'uvalue') {
                  scalar = first;
                  uval = second;
                } else if (first.kind === 'uvalue' && second.kind === 'scalar') {
                  scalar = second;
                  uval = first;
                } else {
                  throw new Error(`SSCALE requires a scalar and a UValue (or two scalars) but received ${first.kind} and ${second.kind}`);
                }
                const arr = this.heap.values[uval.ref];
                const out = new Array(this.M);
                for (let i = 0; i < this.M; i++) {
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
                if (value.kind !== 'uvalue') throw new Error(`LIFT1 expects UValue but received ${value.kind}`);
                const fn = resolveUnaryFunction(args[0]);
                if (!fn) {
                  const knownUnary = Object.keys(UnaryLibrary).join(', ');
                  throw new Error(`Unknown lift1 function '${args[0]}'. Known functions: ${knownUnary} (plus windowWeight_* helpers).`);
                }
                const arr = this.heap.values[value.ref];
                const out = new Array(this.M);
                for (let i = 0; i < this.M; i++) {
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
                  throw new Error(`LIFT2 expects UValues but received ${left.kind} | ${right.kind}`);
                }
                const fn = BinaryLibrary[args[0]];
                if (!fn) {
                  const knownBinary = Object.keys(BinaryLibrary).join(', ');
                  throw new Error(`Unknown lift2 function '${args[0]}'. Known functions: ${knownBinary}.`);
                }
                const arrL = this.heap.values[left.ref];
                const arrR = this.heap.values[right.ref];
                const out = new Array(this.M);
                for (let i = 0; i < this.M; i++) {
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
                  throw new Error(`READ expects UValue | UState but received ${value.kind} | ${state.kind}`);
                }
                const data = this.performRead(value.ref, state.ref);
                const result = { kind: 'scalar', data };
                if (data.novelId != null) result.novelId = data.novelId;
                this.push(result);
                break;
              }
              case 'NORM_STATE': {
                const state = this.pop();
                if (state.kind !== 'ustate') throw new Error(`NORM_STATE expects UState but received ${state.kind}`);
                this.normalizeState(state.ref);
                this.push(state);
                break;
              }
              case 'BUILD_TUPLE': {
                const count = args[0] | 0;
                if (count <= 0) throw new Error('BUILD_TUPLE expects a positive element count');
                const items = new Array(count);
                for (let i = count - 1; i >= 0; i--) {
                  items[i] = this.pop();
                }
                this.push({ kind: 'tuple', items });
                break;
              }
              case 'D_TRANSFORM': {
                const state = this.pop();
                if (state.kind !== 'ustate') throw new Error(`D expects UState but received ${state.kind}`);
                const targetSize = args[0] ?? this.M;
                this.ensureMicrostates(targetSize);
                const arr = this.heap.states[state.ref];
                const rotated = new Array(this.M);
                const offsetRaw = args[0] ?? 0;
                const offset = ((offsetRaw % this.M) + this.M) % this.M;
                for (let i = 0; i < this.M; i++) {
                  const target = (i + offset) % this.M;
                  rotated[target] = cloneComplex(arr[i]);
                }
                const ref = this.allocateUState(rotated);
                this.normalizeState(ref);
                this.push({ kind: 'ustate', ref });
                break;
              }
              case 'CALL_HELPER': {
                const [helperName, argc = 0] = args;
                const callArgs = [];
                for (let i = 0; i < argc; i++) {
                  callArgs.unshift(this.pop());
                }
                const result = this.invokeHelper(helperName, callArgs);
                if (result) this.push(result);
                break;
              }
              case 'BUILD_UVALUE_OF': {
                const indexes = args[0] ?? [];
                const out = Array.from({ length: this.M }, () => ({ real: 0, imag: 0 }));
                const values = new Array(indexes.length);
                for (let i = indexes.length - 1; i >= 0; i--) {
                  values[i] = this.ensureUValueArg(this.pop(), 'uvalue_of');
                }
                for (let i = 0; i < indexes.length; i++) {
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
                if (!tuple || tuple.kind !== 'tuple') throw new Error('UNPACK_TUPLE requires a tuple value');
                const items = tuple.items ?? [];
                if (items.length !== expected) {
                  throw new Error(`UNPACK_TUPLE expected ${expected} values but received ${items.length}`);
                }
                for (let i = 0; i < items.length; i++) {
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
          return this.order.map((name) => {
            const value = this.env.get(name);
            if (!value) return null;
            return {
              name,
              kind: value.kind,
              summary: this.describeValue(value)
            };
          }).filter(Boolean);
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

      const UnaryLibrary = {
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

      function execute(source) {
        resetDiagnostics();
        try {
          const tokens = tokenize(source);
          const parser = new Parser(tokens);
          const ast = parser.parseProgram();
          const compiler = new Compiler();
          const compilation = compiler.compile(ast);
          const vm = new VirtualMachine({
            microstates: getConfiguredMicrostates(),
            diagnostics: {
              print: appendDiagnosticPrint,
              plot: renderDiagnosticPlot
            }
          });
          vm.execute(compilation.instructions);
          currentVm = vm;

          renderOutput(vm.lastValue, compilation.finalType);
          renderAst(ast);
          renderValues(vm.snapshotBindings());
          renderDebug(tokens, compilation.instructions, vm.trace);
          renderReadControls(vm);
          renderInspectors(vm);
          ui.status.textContent = `Execution successful. Microstates=${vm.M}.`;
        } catch (err) {
          currentVm = null;
          ui.output.textContent = 'Execution failed.';
          ui.status.textContent = err.message;
          ui.ast.textContent = '';
          ui.valueTable.innerHTML = '';
          ui.readTester.innerHTML = '';
          ui.readResult.textContent = '';
          ui.debug.textContent = err.stack ?? err.message;
          resetInspectors();
        }
      }

      function renderOutput(value, finalType) {
        if (!value) {
          ui.output.textContent = 'Program produced no terminal value.';
          return;
        }
        if (finalType === 'scalar' && value.kind === 'scalar') {
          const { re, im } = complexToFloat(value.data);
          const micro = currentVm ? ` (M=${currentVm.M})` : '';
          if (value.novelId != null) {
            ui.output.textContent = `Scalar: novel#${value.novelId}${micro}`;
            return;
          }
          ui.output.textContent = `Scalar: ${re.toFixed(6)} + ${im.toFixed(6)}i${micro}`;
          return;
        }
        ui.output.textContent = `Result (${value.kind}) available on stack.`;
      }

      function renderAst(ast) {
        ui.ast.textContent = JSON.stringify(ast, null, 2);
      }

      function renderValues(rows) {
        ui.valueTable.innerHTML = '';
        if (!rows.length) {
          ui.valueTable.innerHTML = '<tr><td colspan="3">No bindings yet.</td></tr>';
          return;
        }
        for (const row of rows) {
          const tr = document.createElement('tr');
          const kindClass = row.kind === 'scalar' ? 'kind-scalar' : row.kind === 'uvalue' ? 'kind-uvalue' : 'kind-ustate';
          tr.innerHTML = `
            <td>${row.name}</td>
            <td><span class="pill ${kindClass}">${row.kind}</span></td>
            <td><span class="summary-chip">${row.summary}</span></td>
          `;
          ui.valueTable.appendChild(tr);
        }
      }

      function renderDebug(tokens, instructions, trace) {
        const tokenLines = tokens.map((t, idx) => `${idx.toString().padStart(3, '0')}: ${t.type}${t.value ? `(${JSON.stringify(t.value)})` : ''}`).join('\n');
        const instrLines = instructions.map((ins, idx) => {
          const argsText = ins.args.length ? ` ${ins.args.join(', ')}` : '';
          return `${idx.toString().padStart(3, '0')}: ${ins.op}${argsText}`;
        }).join('\n');
        const traceLines = trace.join('\n');
        ui.debug.textContent = `TOKENS:\n${tokenLines}\n\nINSTRUCTIONS:\n${instrLines}\n\nTRACE:\n${traceLines}`;
      }

      function renderReadControls(vm) {
        const values = vm.listNames('uvalue');
        const states = vm.listNames('ustate');
        if (!values.length || !states.length) {
          ui.readTester.innerHTML = '<span>Declare at least one UValue and UState to enable manual readouts.</span>';
          ui.readResult.textContent = '';
          return;
        }
        const valueSelect = document.createElement('select');
        values.forEach((name) => {
          const opt = document.createElement('option');
          opt.value = name;
          opt.textContent = name;
          valueSelect.appendChild(opt);
        });
        const stateSelect = document.createElement('select');
        states.forEach((name) => {
          const opt = document.createElement('option');
          opt.value = name;
          opt.textContent = name;
          stateSelect.appendChild(opt);
        });
        const btn = document.createElement('button');
        btn.textContent = 'Read value | state';
        btn.addEventListener('click', () => {
          if (!currentVm) return;
          try {
            const result = currentVm.readNamed(valueSelect.value, stateSelect.value);
            if (result?.novelId != null) {
              ui.readResult.textContent = `read(${valueSelect.value} | ${stateSelect.value}) produced novel#${result.novelId}`;
            } else {
              ui.readResult.textContent = `read(${valueSelect.value} | ${stateSelect.value}) = ${result.re.toFixed(6)} + ${result.im.toFixed(6)}i`;
            }
          } catch (err) {
            ui.readResult.textContent = err.message;
          }
        });
        ui.readTester.innerHTML = '';
        ui.readTester.appendChild(valueSelect);
        ui.readTester.appendChild(stateSelect);
        ui.readTester.appendChild(btn);
      }

      function formatUValueLines(vm, ref) {
        const arr = vm.heap.values[ref] ?? [];
        if (!arr.length) return 'No microstates available.';
        const limit = Math.min(arr.length, 256);
        const lines = [];
        for (let i = 0; i < limit; i++) {
          const sample = arr[i] ?? { real: 0, imag: 0 };
          const { re, im } = complexToFloat(sample);
          const novel = sample?.novelId ? ` novel#${sample.novelId}` : '';
          lines.push(`${i.toString().padStart(4, '0')}: ${re.toFixed(4)} + ${im.toFixed(4)}i${novel}`);
        }
        if (limit < arr.length) lines.push(`... truncated ${arr.length - limit} rows`);
        return lines.join('\n');
      }

      function formatUStateLines(vm, ref) {
        const arr = vm.heap.states[ref] ?? [];
        if (!arr.length) return 'No amplitudes stored.';
        const limit = Math.min(arr.length, 256);
        const lines = [];
        for (let i = 0; i < limit; i++) {
          const entry = arr[i] ?? { real: 0, imag: 0 };
          const weight = decodeReal(magnitudeSquared(entry));
          lines.push(`${i.toString().padStart(4, '0')}: |psi|^2 = ${weight.toFixed(6)}`);
        }
        if (limit < arr.length) lines.push(`... truncated ${arr.length - limit} rows`);
        return lines.join('\n');
      }

      function populateInspectorSelect(select, names, placeholder) {
        if (!select) return;
        select.innerHTML = '';
        if (!names.length) {
          const opt = document.createElement('option');
          opt.value = '';
          opt.textContent = placeholder;
          select.appendChild(opt);
          select.disabled = true;
          return;
        }
        select.disabled = false;
        names.forEach((name) => {
          const opt = document.createElement('option');
          opt.value = name;
          opt.textContent = name;
          select.appendChild(opt);
        });
      }

      function renderInspectors(vm) {
        const insp = ui.inspectors;
        if (!insp?.panel) return;
        populateInspectorSelect(insp.uvalueSelect, vm.listNames('uvalue'), 'No UValues');
        populateInspectorSelect(insp.stateSelect, vm.listNames('ustate'), 'No UStates');
        if (insp.uvalueOutput) insp.uvalueOutput.textContent = 'Select a UValue to view amplitudes.';
        if (insp.stateOutput) insp.stateOutput.textContent = 'Select a UState to view |psi|^2 weights.';
        if (insp.novelOutput) {
          const entries = vm.heap.novels.entries ?? [];
          if (!entries.length) {
            insp.novelOutput.textContent = 'No novel values recorded.';
          } else {
            const text = entries.map((entry) => {
              const args = (entry.args ?? []).map((arg) => JSON.stringify(arg)).join(', ');
              return `#${entry.id}: ${entry.op}(${args}) @ ${entry.index}`;
            }).join('\n');
            insp.novelOutput.textContent = text;
          }
        }
      }

      function resetDiagnostics() {
        diagnosticsController?.reset();
      }

      function appendDiagnosticPrint(text) {
        diagnosticsController?.recordPrint(text);
      }

      function renderDiagnosticPlot(values) {
        diagnosticsController?.recordPlot(values);
      }

      function resetInspectors() {
        const insp = ui.inspectors;
        if (!insp) return;
        if (insp.uvalueSelect) {
          insp.uvalueSelect.innerHTML = '<option value="">No UValues declared</option>';
          insp.uvalueSelect.disabled = true;
        }
        if (insp.stateSelect) {
          insp.stateSelect.innerHTML = '<option value="">No UStates declared</option>';
          insp.stateSelect.disabled = true;
        }
        if (insp.uvalueOutput) insp.uvalueOutput.textContent = 'Select a UValue to view amplitudes.';
        if (insp.stateOutput) insp.stateOutput.textContent = 'Select a UState to view |psi|^2 weights.';
        if (insp.novelOutput) insp.novelOutput.textContent = 'No novel values recorded.';
      }

      ui.source.value = sampleProgram;
      updateHighlight();
      resetInspectors();
      resetDiagnostics();
    })()