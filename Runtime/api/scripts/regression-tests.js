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
