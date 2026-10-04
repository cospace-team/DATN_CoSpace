package com.cospace.app.repository;

import com.cospace.app.entity.PostComment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;
import java.util.UUID;

@Repository
public interface PostCommentRepository extends JpaRepository<PostComment, UUID> {

    List<PostComment> findByPostIdOrderByCreatedAtAsc(UUID postId);

    /** [postId, count] for several posts at once. */
    @Query("SELECT c.postId, COUNT(c) FROM PostComment c WHERE c.postId IN :postIds GROUP BY c.postId")
    List<Object[]> countByPostIds(@Param("postIds") Collection<UUID> postIds);
}
