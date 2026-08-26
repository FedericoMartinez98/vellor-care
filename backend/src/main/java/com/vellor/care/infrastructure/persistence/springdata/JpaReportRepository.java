package com.vellor.care.infrastructure.persistence.springdata;

import com.vellor.care.domain.model.ReportKey;
import com.vellor.care.infrastructure.persistence.entity.ReportEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface JpaReportRepository extends JpaRepository<ReportEntity, UUID> {

    List<ReportEntity> findByOwnerIdOrSharedTrue(UUID ownerId);

    List<ReportEntity> findByReportKey(ReportKey reportKey);
}
