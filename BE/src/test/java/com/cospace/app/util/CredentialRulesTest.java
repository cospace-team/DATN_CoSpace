package com.cospace.app.util;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class CredentialRulesTest {

    @Test
    void weakPasswordsAreRefused() {
        for (String weak : new String[]{"123", "abcdefgh", "ABCDEFGH1", "Abcdefgh", "Ab1"}) {
            assertThatThrownBy(() -> CredentialRules.requireStrongPassword(weak))
                    .as(weak).isInstanceOf(IllegalArgumentException.class);
        }
        CredentialRules.requireStrongPassword("LeTan2026");
    }

    @Test
    void phonesAreNormalisedOrRefused() {
        assertThat(CredentialRules.normalizePhone("0901 234 567")).isEqualTo("0901234567");
        assertThat(CredentialRules.normalizePhone("+84 912-345-678")).isEqualTo("0912345678");
        assertThat(CredentialRules.normalizePhone("  ")).isNull();
        for (String bad : new String[]{"abc123", "xin chao <b>", "012345678", "0201234567", "09012345678"}) {
            assertThatThrownBy(() -> CredentialRules.normalizePhone(bad))
                    .as(bad).isInstanceOf(IllegalArgumentException.class);
        }
    }
}
