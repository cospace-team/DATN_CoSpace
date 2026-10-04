package com.cospace.app.service;

import com.cospace.app.dto.api.PartnerSuggestionDto;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class PartnerMatchingReasonTest {

    @Test
    void sharedTagsAreCalledCommonInterests() {
        PartnerSuggestionDto s = PartnerSuggestionDto.builder().commonTags(List.of("Frontend Dev")).build();

        assertThat(PartnerMatchingService.fallbackReason(s)).isEqualTo("Cùng quan tâm Frontend Dev.");
    }

    @Test
    void theMembersOwnSkillsAreNotPresentedAsSharedOnes() {
        PartnerSuggestionDto s = PartnerSuggestionDto.builder()
                .commonTags(List.of("Frontend Dev", "UI/UX Design")).commonTagsShared(false).build();

        assertThat(PartnerMatchingService.fallbackReason(s)).isEqualTo("Làm về Frontend Dev, UI/UX Design.");
    }
}
