package com.cospace.app.service;

import com.cospace.app.dto.api.TagDto;
import com.cospace.app.entity.Tag;
import com.cospace.app.repository.TagRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class TagService {

    private final TagRepository tagRepository;

    @Transactional(readOnly = true)
    public List<TagDto> getTags(String category) {
        List<Tag> list;
        if (category != null && !category.isBlank()) {
            list = tagRepository.findByCategoryAndIsActiveTrue(category.toLowerCase().trim());
        } else {
            list = tagRepository.findByIsActiveTrue();
        }
        return list.stream()
                .map(t -> new TagDto(t.getId(), t.getName(), t.getCategory(), t.isActive()))
                .toList();
    }

    @Transactional
    public TagDto createTag(String name, String category) {
        String trimmedName = name.trim();
        tagRepository.findByNameIgnoreCase(trimmedName).ifPresent(t -> {
            throw new IllegalArgumentException("Tag đã tồn tại: " + trimmedName);
        });

        Tag tag = Tag.builder()
                .name(trimmedName)
                .category(category != null ? category.toLowerCase().trim() : "skill")
                .isActive(true)
                .build();
        tag = tagRepository.save(tag);
        return new TagDto(tag.getId(), tag.getName(), tag.getCategory(), tag.isActive());
    }

    @Transactional
    public TagDto updateTag(UUID id, String name, String category, boolean isActive) {
        Tag tag = tagRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy tag với ID: " + id));

        if (name != null && !name.isBlank()) {
            String trimmed = name.trim();
            tagRepository.findByNameIgnoreCase(trimmed).ifPresent(existing -> {
                if (!existing.getId().equals(id)) {
                    throw new IllegalArgumentException("Tên tag đã được sử dụng: " + trimmed);
                }
            });
            tag.setName(trimmed);
        }
        if (category != null && !category.isBlank()) {
            tag.setCategory(category.toLowerCase().trim());
        }
        tag.setActive(isActive);

        tag = tagRepository.save(tag);
        return new TagDto(tag.getId(), tag.getName(), tag.getCategory(), tag.isActive());
    }

    @Transactional
    public void deleteTag(UUID id) {
        Tag tag = tagRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy tag với ID: " + id));
        tag.setActive(false);
        tagRepository.save(tag);
    }
}
