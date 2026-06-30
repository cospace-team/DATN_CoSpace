package com.example.momosandbox.repository;

import com.example.momosandbox.entity.Floor;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface FloorRepository extends JpaRepository<Floor, UUID> {

    List<Floor> findByBranchIdOrderByFloorNo(UUID branchId);

    Optional<Floor> findByBranchIdAndFloorNo(UUID branchId, int floorNo);

    boolean existsByBranchIdAndFloorNo(UUID branchId, int floorNo);
}
