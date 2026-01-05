#ifndef UNS_MCU_RUNTIME_H
#define UNS_MCU_RUNTIME_H

#include <stdint.h>
#include "uns_mcu_config.h"

#ifdef __cplusplus
extern "C" {
#endif

// Fixed-point scalar represented as Q16.16 signed value.
typedef int32_t uns_q16_16_t;

typedef struct {
    uns_q16_16_t real;
    uns_q16_16_t imag;
} uns_complex_t;

typedef struct {
    uns_complex_t *values;
    uint16_t length;
} uns_uvalue_t;

typedef struct {
    uns_complex_t *amplitudes;
    uint16_t length;
} uns_state_t;

typedef enum {
    UNS_OP_NOP = 0,
    UNS_OP_NORMALIZE_STATE = 1,
    UNS_OP_READ = 2,
} uns_opcode_t;

typedef struct {
    uns_opcode_t opcode;
    uint8_t dst;  // For UNS_OP_READ: index into readouts array
    uint8_t src0; // Typically the state index
    uint8_t src1; // Typically the value index
} uns_instruction_t;

typedef struct {
    const uns_instruction_t *instructions;
    uint16_t length;
    uns_state_t **states;
    uint16_t state_count;
    uns_uvalue_t **values;
    uint16_t value_count;
    uns_complex_t *readouts;
    uint16_t readout_count;
} uns_program_t;

// Initializes shared buffers or hardware hooks required by the MCU runtime.
void uns_mcu_runtime_init(void);

// Normalizes the provided state in-place. Returns 0 on success.
int uns_state_normalize(uns_state_t *state);

// Executes a mini UNS program using the provided state and values.
int uns_execute(const uns_program_t *program);

// Computes read(value | state) using fixed-point accumulation.
uns_complex_t uns_read(const uns_uvalue_t *value, const uns_state_t *state);

#ifdef __cplusplus
}
#endif

#endif // UNS_MCU_RUNTIME_H
