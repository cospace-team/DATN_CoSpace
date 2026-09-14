package com.cospace.app.repository;

import com.cospace.app.entity.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
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

    @org.springframework.data.jpa.repository.Query("SELECT u FROM User u WHERE lower(u.fullName) LIKE lower(concat('%',:query,'%')) OR lower(u.email) LIKE lower(concat('%',:query,'%')) OR u.phone LIKE concat('%',:query,'%')")
    java.util.List<User> searchUsers(@org.springframework.data.repository.query.Param("query") String query);

    java.util.List<User> findByBranchIdAndRole(UUID branchId, User.Role role);

    boolean existsByEmailAndIdNot(String email, UUID id);

    @org.springframework.data.jpa.repository.Query("SELECT u FROM User u WHERE " +
            "(:role IS NULL OR u.role = :role) AND " +
            "(:branchId IS NULL OR u.branchId = :branchId) AND " +
            "(:status IS NULL OR u.status = :status) AND " +
            "(:search IS NULL OR :search = '' OR lower(u.fullName) LIKE lower(concat('%', :search, '%')) OR lower(u.email) LIKE lower(concat('%', :search, '%')) OR u.phone LIKE concat('%', :search, '%'))")
    Page<User> filterUsers(
            @org.springframework.data.repository.query.Param("role") User.Role role,
            @org.springframework.data.repository.query.Param("branchId") UUID branchId,
            @org.springframework.data.repository.query.Param("status") User.Status status,
            @org.springframework.data.repository.query.Param("search") String search,
            Pageable pageable);
}
