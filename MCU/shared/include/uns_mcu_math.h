#ifndef UNS_MCU_MATH_H
#define UNS_MCU_MATH_H

#include <stdint.h>
#include <math.h>
#include "uns_mcu_runtime.h"

#ifndef UNS_Q16_SCALE
#define UNS_Q16_SCALE 65536.0
#endif

static inline double uns_q16_to_double(uns_q16_16_t value) {
    return (double)value / UNS_Q16_SCALE;
}

static inline uns_q16_16_t uns_double_to_q16(double value) {
    const double max_val = 2147483647.0;
    const double min_val = -2147483648.0;
    double scaled = value * UNS_Q16_SCALE;
    if (scaled > max_val) {
        scaled = max_val;
    } else if (scaled < min_val) {
        scaled = min_val;
    }
    return (uns_q16_16_t)llround(scaled);
}

static inline double uns_complex_mag_sq(const uns_complex_t *c) {
    double real = uns_q16_to_double(c->real);
    double imag = uns_q16_to_double(c->imag);
    return real * real + imag * imag;
}

static inline uns_complex_t uns_complex_scale(const uns_complex_t *c, double scale) {
    uns_complex_t result;
    result.real = uns_double_to_q16(uns_q16_to_double(c->real) * scale);
    result.imag = uns_double_to_q16(uns_q16_to_double(c->imag) * scale);
    return result;
}

static inline uns_complex_t uns_complex_add(const uns_complex_t *a, const uns_complex_t *b) {
    uns_complex_t result;
    result.real = uns_double_to_q16(uns_q16_to_double(a->real) + uns_q16_to_double(b->real));
    result.imag = uns_double_to_q16(uns_q16_to_double(a->imag) + uns_q16_to_double(b->imag));
    return result;
}

static inline uns_complex_t uns_complex_mul(const uns_complex_t *a, const uns_complex_t *b) {
    double ar = uns_q16_to_double(a->real);
    double ai = uns_q16_to_double(a->imag);
    double br = uns_q16_to_double(b->real);
    double bi = uns_q16_to_double(b->imag);
    uns_complex_t result;
    result.real = uns_double_to_q16(ar * br - ai * bi);
    result.imag = uns_double_to_q16(ar * bi + ai * br);
    return result;
}

#endif // UNS_MCU_MATH_H
