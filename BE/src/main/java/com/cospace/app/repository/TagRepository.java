package com.cospace.app.repository;

import com.cospace.app.entity.Tag;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface TagRepository extends JpaRepository<Tag, UUID> {

    List<Tag> findByIsActiveTrue();

    List<Tag> findByCategoryAndIsActiveTrue(String category);

    Optional<Tag> findByNameIgnoreCase(String name);
}
