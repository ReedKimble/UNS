#include <stddef.h>
#include <math.h>
#include "uns_mcu_runtime.h"
#include "uns_mcu_math.h"

static uns_state_t *get_state(const uns_program_t *program, uint8_t idx) {
    if (!program || !program->states || idx >= program->state_count) {
        return NULL;
    }
    return program->states[idx];
}

static uns_uvalue_t *get_value(const uns_program_t *program, uint8_t idx) {
    if (!program || !program->values || idx >= program->value_count) {
        return NULL;
    }
    return program->values[idx];
}

static uns_complex_t *get_readout_slot(const uns_program_t *program, uint8_t idx) {
    if (!program || !program->readouts || idx >= program->readout_count) {
        return NULL;
    }
    return &program->readouts[idx];
}

void uns_mcu_runtime_init(void) {
    // Shared runtime is stateless for now.
}

int uns_state_normalize(uns_state_t *state) {
    if (!state || !state->amplitudes || state->length == 0) {
        return -1;
    }

    double sum = 0.0;
    for (uint16_t i = 0; i < state->length; ++i) {
        sum += uns_complex_mag_sq(&state->amplitudes[i]);
    }

    if (sum <= 0.0) {
        return -2;
    }

    double inv_norm = 1.0 / sqrt(sum);
    for (uint16_t i = 0; i < state->length; ++i) {
        double real = uns_q16_to_double(state->amplitudes[i].real) * inv_norm;
        double imag = uns_q16_to_double(state->amplitudes[i].imag) * inv_norm;
        state->amplitudes[i].real = uns_double_to_q16(real);
        state->amplitudes[i].imag = uns_double_to_q16(imag);
    }

    return 0;
}

int uns_execute(const uns_program_t *program) {
    if (!program || !program->instructions) {
        return -1;
    }

    for (uint16_t i = 0; i < program->length; ++i) {
        const uns_instruction_t *instr = &program->instructions[i];
        switch (instr->opcode) {
        case UNS_OP_NOP:
            break;
        case UNS_OP_NORMALIZE_STATE: {
            uns_state_t *state = get_state(program, instr->src0);
            if (!state) {
                return -2;
            }
            if (uns_state_normalize(state) != 0) {
                return -3;
            }
            break;
        }
        case UNS_OP_READ: {
            uns_state_t *state = get_state(program, instr->src0);
            uns_uvalue_t *value = get_value(program, instr->src1);
            uns_complex_t *dest = get_readout_slot(program, instr->dst);
            if (!state || !value || !dest) {
                return -4;
            }
            *dest = uns_read(value, state);
            break;
        }
        default:
            return -5;
        }
    }

    return 0;
}

uns_complex_t uns_read(const uns_uvalue_t *value, const uns_state_t *state) {
    uns_complex_t result = {0, 0};

    if (!value || !state || !value->values || !state->amplitudes) {
        return result;
    }

    uint16_t length = value->length < state->length ? value->length : state->length;
    if (length == 0) {
        return result;
    }

    double accum_real = 0.0;
    double accum_imag = 0.0;
    double total_weight = 0.0;

    for (uint16_t i = 0; i < length; ++i) {
        double weight = uns_complex_mag_sq(&state->amplitudes[i]);
        total_weight += weight;

        double val_real = uns_q16_to_double(value->values[i].real);
        double val_imag = uns_q16_to_double(value->values[i].imag);

        accum_real += val_real * weight;
        accum_imag += val_imag * weight;
    }

    if (total_weight <= 0.0) {
        return result;
    }

    result.real = uns_double_to_q16(accum_real / total_weight);
    result.imag = uns_double_to_q16(accum_imag / total_weight);
    return result;
}
