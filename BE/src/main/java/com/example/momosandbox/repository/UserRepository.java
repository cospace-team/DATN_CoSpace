package com.example.momosandbox.repository;

import com.example.momosandbox.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface UserRepository extends JpaRepository<User, UUID> {
    Optional<User> findByEmail(String email);
    boolean existsByEmail(String email);

    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.data.jpa.repository.Query(value = "UPDATE users SET id = :newId WHERE id = :oldId", nativeQuery = true)
    void updateUserId(@org.springframework.data.repository.query.Param("oldId") UUID oldId, @org.springframework.data.repository.query.Param("newId") UUID newId);
}
