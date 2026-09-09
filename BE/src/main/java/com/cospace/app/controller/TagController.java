package com.cospace.app.controller;

import com.cospace.app.dto.api.TagDto;
import com.cospace.app.service.TagService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/tags")
@RequiredArgsConstructor
public class TagController {

    private final TagService tagService;

    @GetMapping
    public ResponseEntity<List<TagDto>> getTags(@RequestParam(value = "category", required = false) String category) {
        return ResponseEntity.ok(tagService.getTags(category));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('super_admin', 'admin')")
    public ResponseEntity<?> createTag(@RequestBody Map<String, String> body) {
        try {
            String name = body.get("name");
            String category = body.get("category");
            if (name == null || name.isBlank()) {
                return ResponseEntity.badRequest().body(Map.of("error", "Tên tag không được để trống"));
            }
            TagDto created = tagService.createTag(name, category);
            return ResponseEntity.status(HttpStatus.CREATED).body(created);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('super_admin', 'admin')")
    public ResponseEntity<?> updateTag(@PathVariable UUID id, @RequestBody Map<String, Object> body) {
        try {
            String name = (String) body.get("name");
            String category = (String) body.get("category");
            Boolean isActive = body.containsKey("isActive") ? (Boolean) body.get("isActive") : true;
            TagDto updated = tagService.updateTag(id, name, category, isActive);
            return ResponseEntity.ok(updated);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('super_admin', 'admin')")
    public ResponseEntity<?> deleteTag(@PathVariable UUID id) {
        try {
            tagService.deleteTag(id);
            return ResponseEntity.ok(Map.of("message", "Đã vô hiệu hóa tag"));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
}
