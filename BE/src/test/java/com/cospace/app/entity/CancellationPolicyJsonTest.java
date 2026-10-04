package com.cospace.app.entity;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class CancellationPolicyJsonTest {

    private final ObjectMapper mapper = new ObjectMapper().findAndRegisterModules();

    @Test
    void activeFlagIsPublishedAsIsActive() throws Exception {
        CancellationPolicy policy = CancellationPolicy.builder().name("Tiêu chuẩn").isActive(true).build();

        assertThat(mapper.readTree(mapper.writeValueAsString(policy)).get("isActive").asBoolean()).isTrue();
    }

    @Test
    void isActiveFromTheFormsIsRead() throws Exception {
        CancellationPolicy off = mapper.readValue("{\"name\":\"x\",\"isActive\":false}", CancellationPolicy.class);
        CancellationPolicy offLegacy = mapper.readValue("{\"name\":\"x\",\"active\":false}", CancellationPolicy.class);

        assertThat(off.isActive()).isFalse();
        assertThat(offLegacy.isActive()).isFalse();
    }
}
