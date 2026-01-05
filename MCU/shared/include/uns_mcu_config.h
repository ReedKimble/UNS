#ifndef UNS_MCU_CONFIG_H
#define UNS_MCU_CONFIG_H

// Central configuration header for MCU builds of the UNS runtime.
// Each platform can override these macros before including any shared headers.

#ifndef UNS_MCU_DEFAULT_MICROSTATES
#define UNS_MCU_DEFAULT_MICROSTATES 8
#endif

#ifndef UNS_MCU_ENABLE_LIFT2
#define UNS_MCU_ENABLE_LIFT2 1
#endif

#ifndef UNS_MCU_ENABLE_D_TRANSFORM
#define UNS_MCU_ENABLE_D_TRANSFORM 0
#endif

#ifndef UNS_MCU_ENABLE_COMPLEX_PHASE
#define UNS_MCU_ENABLE_COMPLEX_PHASE 1
#endif

#ifndef UNS_MCU_LOG_CALLBACK
#define UNS_MCU_LOG_CALLBACK(message)
#endif

#endif // UNS_MCU_CONFIG_H
