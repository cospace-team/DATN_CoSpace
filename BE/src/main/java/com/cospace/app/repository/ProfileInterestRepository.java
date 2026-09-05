package com.cospace.app.repository;

import com.cospace.app.entity.ProfileInterest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface ProfileInterestRepository extends JpaRepository<ProfileInterest, ProfileInterest.ProfileInterestId> {

    List<ProfileInterest> findByProfileUserId(UUID profileUserId);

    void deleteByProfileUserId(UUID profileUserId);
}
