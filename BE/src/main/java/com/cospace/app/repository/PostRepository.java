package com.cospace.app.repository;

import com.cospace.app.entity.Post;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface PostRepository extends JpaRepository<Post, UUID> {

    List<Post> findByStatusOrderByCreatedAtDesc(String status);

    List<Post> findByAuthorUserIdOrderByCreatedAtDesc(UUID authorUserId);
}
