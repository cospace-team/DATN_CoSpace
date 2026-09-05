package com.cospace.app.repository;

import com.cospace.app.entity.ProfileMatchScore;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface ProfileMatchScoreRepository extends JpaRepository<ProfileMatchScore, ProfileMatchScore.ProfileMatchScoreId> {

    List<ProfileMatchScore> findByProfileUserIdOrderByScoreDesc(UUID profileUserId);

    void deleteByProfileUserIdOrMatchedUserId(UUID profileUserId, UUID matchedUserId);
}
