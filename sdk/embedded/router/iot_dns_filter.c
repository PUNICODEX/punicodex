/**
 * PuniCodex — Router / IoT DNS filter sample
 *
 * Minimal C stub showing how an embedded firmware module could call the
 * lightweight classifier before resolving a DNS name. Production firmware would
 * link a WASM or native port of the confusable atlas and brand seed.
 */

#include <stdbool.h>
#include <stdint.h>
#include <stdio.h>
#include <string.h>

/* Placeholder: production builds would embed the full confusable map. */
static int punicodex_classify(const char *name) {
    if (name == NULL || name[0] == '\0') {
        return 0; /* unknown / none */
    }

    /* Stupid-simple placeholder heuristics for the sample. */
    size_t len = strlen(name);
    for (size_t i = 0; i < len; i++) {
        unsigned char c = (unsigned char)name[i];
        /* Cyrillic block U+0400-U+04FF encoded as UTF-8 starts with 0xD0/0xD1. */
        if (c == 0xD0 || c == 0xD1) {
            return 3; /* high: mixed-script / homograph risk */
        }
    }

    if (strstr(name, "fake-") != NULL || strstr(name, "evil-") != NULL) {
        return 4; /* critical: blocked pattern */
    }

    return 0; /* unknown / none */
}

static const char *severity_name(int severity) {
    switch (severity) {
        case 0: return "none";
        case 1: return "low";
        case 2: return "medium";
        case 3: return "high";
        case 4: return "critical";
        default: return "unknown";
    }
}

int main(void) {
    const char *tests[] = {
        "apple.com",
        "\xD0\xB0pple.com", /* Cyrillic а + pple */
        "fake-apple.com",
    };

    for (size_t i = 0; i < sizeof(tests) / sizeof(tests[0]); i++) {
        const char *name = tests[i];
        int severity = punicodex_classify(name);
        printf("%s -> %s\n", name, severity_name(severity));
    }

    return 0;
}
