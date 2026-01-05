#include <stdio.h>
#include <math.h>
#include "uns_mcu_runtime.h"
#include "uns_mcu_math.h"

static int nearly_equal(double a, double b, double eps) {
    return fabs(a - b) <= eps;
}

static int test_state_normalize(void) {
    uns_complex_t amplitudes[2] = {
        {uns_double_to_q16(3.0), 0},
        {uns_double_to_q16(4.0), 0},
    };
    uns_state_t state = { amplitudes, 2 };

    int rc = uns_state_normalize(&state);
    if (rc != 0) {
        printf("uns_state_normalize failed with %d\n", rc);
        return 1;
    }

    double mag0 = uns_complex_mag_sq(&state.amplitudes[0]);
    double mag1 = uns_complex_mag_sq(&state.amplitudes[1]);
    double sum = mag0 + mag1;

    if (!nearly_equal(sum, 1.0, 1e-6)) {
        printf("Normalization sum mismatch: %f\n", sum);
        return 1;
    }

    return 0;
}

static int test_uns_read(void) {
    uns_complex_t amplitudes[2] = {
        {uns_double_to_q16(0.6), 0},
        {uns_double_to_q16(0.8), 0},
    };
    uns_state_t state = { amplitudes, 2 };
    if (uns_state_normalize(&state) != 0) {
        printf("Failed to normalize state in read test\n");
        return 1;
    }

    uns_complex_t values[2] = {
        {uns_double_to_q16(0.25), 0},
        {uns_double_to_q16(0.75), 0},
    };
    uns_uvalue_t value = { values, 2 };

    uns_complex_t result = uns_read(&value, &state);
    double real = uns_q16_to_double(result.real);

    if (!nearly_equal(real, 0.5, 1e-4)) {
        printf("uns_read real mismatch: %f\n", real);
        return 1;
    }

    if (result.imag != 0) {
        printf("uns_read imag expected 0, got %d\n", result.imag);
        return 1;
    }

    return 0;
}

static int test_uns_execute_program(void) {
    uns_complex_t amplitudes[2] = {
        {uns_double_to_q16(2.0), 0},
        {uns_double_to_q16(1.0), 0},
    };
    uns_state_t state = { amplitudes, 2 };
    uns_state_t *state_ptrs[] = { &state };

    uns_complex_t values[2] = {
        {uns_double_to_q16(0.0), 0},
        {uns_double_to_q16(1.0), 0},
    };
    uns_uvalue_t value = { values, 2 };
    uns_uvalue_t *value_ptrs[] = { &value };

    uns_complex_t readouts[1] = {0};

    uns_instruction_t program_instructions[] = {
        { UNS_OP_NORMALIZE_STATE, 0, 0, 0 },
        { UNS_OP_READ, 0, 0, 0 },
    };

    uns_program_t program = {
        .instructions = program_instructions,
        .length = (uint16_t)(sizeof(program_instructions) / sizeof(program_instructions[0])),
        .states = state_ptrs,
        .state_count = 1,
        .values = value_ptrs,
        .value_count = 1,
        .readouts = readouts,
        .readout_count = 1,
    };

    int rc = uns_execute(&program);
    if (rc != 0) {
        printf("uns_execute failed with %d\n", rc);
        return 1;
    }

    double result = uns_q16_to_double(readouts[0].real);
    if (!nearly_equal(result, 2.0 / 3.0, 1e-4)) {
        printf("uns_execute read mismatch: %f\n", result);
        return 1;
    }

    return 0;
}

int main(void) {
    int failures = 0;
    failures += test_state_normalize();
    failures += test_uns_read();
    failures += test_uns_execute_program();

    if (failures == 0) {
        printf("All UNS MCU tests passed.\n");
        return 0;
    }

    printf("UNS MCU tests failed: %d\n", failures);
    return 1;
}
