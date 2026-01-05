extern "C" {
#include "../../shared/include/uns_mcu_runtime.h"
#include "../../shared/include/uns_mcu_math.h"
}

static uns_complex_t amplitudes[2];
static uns_state_t state = { amplitudes, 2 };
static uns_complex_t values[2];
static uns_uvalue_t observable = { values, 2 };

void setup() {
  Serial.begin(115200);
  while (!Serial) {
    ;
  }

  amplitudes[0].real = uns_double_to_q16(1.0);
  amplitudes[0].imag = 0;
  amplitudes[1].real = 0;
  amplitudes[1].imag = 0;

  if (uns_state_normalize(&state) != 0) {
    Serial.println(F("Failed to normalize state"));
    return;
  }

  values[0].real = uns_double_to_q16(0.25);
  values[0].imag = 0;
  values[1].real = uns_double_to_q16(0.75);
  values[1].imag = 0;

  uns_complex_t result = uns_read(&observable, &state);
  double value = uns_q16_to_double(result.real);
  Serial.print(F("read(value | state) = "));
  Serial.println(value, 6);
}

void loop() {
  delay(1000);
}
