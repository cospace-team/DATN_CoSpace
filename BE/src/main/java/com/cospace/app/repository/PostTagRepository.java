package com.cospace.app.repository;

import com.cospace.app.entity.PostTag;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface PostTagRepository extends JpaRepository<PostTag, PostTag.PostTagId> {

    List<PostTag> findByPostId(UUID postId);

    void deleteByPostId(UUID postId);

    /**
     * Every (author, tag) pair across published posts, in one query — used by partner matching so
     * scoring every candidate doesn't turn into a per-candidate query.
     */
    @Query(value = "SELECT p.author_user_id, pt.tag_id FROM post_tags pt "
            + "JOIN posts p ON p.id = pt.post_id WHERE p.status = 'published'", nativeQuery = true)
    List<Object[]> findAuthorTagPairs();
}
