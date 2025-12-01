#!/usr/bin/env node
'use strict';

const path = require('path');
const {
  executeSource
} = require(path.join(__dirname, '..', 'src', 'runtime', 'core'));

const TOLERANCE = 1e-6;

function expect(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function expectClose(actual, expected, label) {
  const delta = Math.abs(actual - expected);
  expect(
    delta <= TOLERANCE,
    `${label} expected ${expected} but received ${actual} (Δ=${delta})`
  );
}

const TESTS = [
  {
    name: 'novelVariancePropagates',
    description: 'divU divide-by-zero should propagate a novel through varianceU and reads',
    source: `let zeros = collection(const(0))
let ones = collection(const(1))
let unstable = divU(ones, zeros)
state psi = state_range(0, 15)
varianceU(unstable)`,
    microstates: 32,
    reads: [{ value: 'unstable', state: 'psi' }],
    assert: (result) => {
      expect(result.result?.kind === 'scalar', 'varianceU must return scalar');
      const novelId = result.result?.novelId;
      expect(typeof novelId === 'number', 'varianceU result should carry a novelId');
      expect(
        Array.isArray(result.reads) && result.reads[0]?.novelId === novelId,
        'read(unstable | psi) should report the same novelId'
      );
    }
  },
  {
    name: 'meanUConstantValue',
    description: 'meanU of a constant UValue should equal that constant',
    source: `let base = const(2)
meanU(base)`,
    microstates: 32,
    assert: (result) => {
      expect(result.result?.kind === 'scalar', 'meanU must return scalar');
      expect(result.result?.novelId == null, 'meanU constant should not be novel');
      expectClose(result.result.real, 2, 'meanU real part');
      expectClose(result.result.imag, 0, 'meanU imag part');
    }
  },
  {
    name: 'densityUMaskRange',
    description: 'densityU should reflect overlap fraction (mask_range covers 5 of 10 states)',
    source: `let mask = mask_range(0, 5)
state psi = state_range(0, 9)
densityU(mask, psi)`,
    microstates: 32,
    assert: (result) => {
      expect(result.result?.kind === 'scalar', 'densityU must return scalar');
      expect(result.result?.novelId == null, 'densityU mask_range should not be novel');
      expectClose(result.result.real, 0.5, 'densityU real part');
      expectClose(result.result.imag, 0, 'densityU imag part');
    }
  },
  {
    name: 'overlapDotStateInteraction',
    description: 'psi_uniform compared against its D-rotated copy should keep OVERLAP readable and DOT≈1',
    source: `state psi1 = psi_uniform()
state psi2 = D(8, psi1)

let overlap_val = OVERLAP(psi1, psi2)
let dot_val = DOT(psi1, psi2)

read(overlap_val | psi1)
dot_val`,
    microstates: 32,
    reads: [{ value: 'overlap_val', state: 'psi1' }],
    assert: (result) => {
      const expectedOverlap = 1 / 32;
      expect(result.result?.kind === 'scalar', 'DOT must return scalar');
      expect(result.result?.novelId == null, 'DOT psi_uniform should not be novel');
      expectClose(result.result.real, expectedOverlap, 'DOT similarity real part');
      expectClose(result.result.imag, 0, 'DOT similarity imag part');
      expect(Array.isArray(result.reads) && result.reads.length === 1, 'overlap read should be returned');
      expectClose(result.reads[0].real, expectedOverlap, 'read(overlap_val | psi1) real part');
      expectClose(result.reads[0].imag, 0, 'read(overlap_val | psi1) imag part');
    }
  }
];

function runTest(test) {
  const execution = executeSource(test.source, {
    microstates: test.microstates,
    reads: test.reads
  });
  test.assert(execution);
  return execution;
}

function main() {
  let passed = 0;
  const failures = [];
  TESTS.forEach((test) => {
    try {
      runTest(test);
      passed += 1;
      console.log(`✔ ${test.name}`);
    } catch (err) {
      failures.push({ test, error: err });
      console.error(`✖ ${test.name}: ${err.message}`);
    }
  });

  console.log(`\n${passed}/${TESTS.length} regression cases passed.`);
  if (failures.length) {
    process.exitCode = 1;
  }
}

if (require.main === module) {
  main();
}
