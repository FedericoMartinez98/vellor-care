package com.vellor.care.domain.repository;

import com.vellor.care.domain.model.ReportDefinition;
import com.vellor.care.domain.model.ReportKey;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ReportRepository {
    Optional<ReportDefinition> findById(UUID id);
    List<ReportDefinition> findByOwnerId(UUID ownerId);
    List<ReportDefinition> findByReportKey(ReportKey reportKey);
    ReportDefinition save(ReportDefinition report);
    void deleteById(UUID id);
}
