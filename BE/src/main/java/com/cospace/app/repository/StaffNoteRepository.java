package com.cospace.app.repository;

import com.cospace.app.entity.StaffNote;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface StaffNoteRepository extends JpaRepository<StaffNote, UUID> {

    @Query("SELECT n FROM StaffNote n WHERE n.branchId = :branchId "
            + "AND (:kind IS NULL OR n.kind = :kind) "
            + "AND (:status IS NULL OR n.status = :status) "
            + "AND (:customerId IS NULL OR n.customerId = :customerId) "
            + "ORDER BY n.createdAt DESC")
    List<StaffNote> search(@Param("branchId") UUID branchId, @Param("kind") String kind,
                           @Param("status") String status, @Param("customerId") UUID customerId,
                           org.springframework.data.domain.Pageable pageable);
}
