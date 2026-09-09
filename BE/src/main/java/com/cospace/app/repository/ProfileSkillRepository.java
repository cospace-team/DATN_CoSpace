package com.cospace.app.repository;

import com.cospace.app.entity.ProfileSkill;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface ProfileSkillRepository extends JpaRepository<ProfileSkill, ProfileSkill.ProfileSkillId> {

    List<ProfileSkill> findByProfileUserId(UUID profileUserId);

    void deleteByProfileUserId(UUID profileUserId);
}
