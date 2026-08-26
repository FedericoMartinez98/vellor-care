package com.vellor.care.infrastructure.persistence.adapter;

import com.vellor.care.domain.model.ReportDefinition;
import com.vellor.care.domain.model.ReportKey;
import com.vellor.care.domain.repository.ReportRepository;
import com.vellor.care.infrastructure.persistence.entity.ReportEntity;
import com.vellor.care.infrastructure.persistence.mapper.ReportMapper;
import com.vellor.care.infrastructure.persistence.springdata.JpaReportRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Component
@RequiredArgsConstructor
public class ReportRepositoryAdapter implements ReportRepository {

    private final JpaReportRepository jpaReportRepository;
    private final ReportMapper reportMapper;

    @Override
    public Optional<ReportDefinition> findById(UUID id) {
        return jpaReportRepository.findById(id)
            .map(reportMapper::toDomain);
    }

    @Override
    public List<ReportDefinition> findByOwnerId(UUID ownerId) {
        return jpaReportRepository.findByOwnerIdOrSharedTrue(ownerId).stream()
            .map(reportMapper::toDomain)
            .toList();
    }

    @Override
    public List<ReportDefinition> findByReportKey(ReportKey reportKey) {
        return jpaReportRepository.findByReportKey(reportKey).stream()
            .map(reportMapper::toDomain)
            .toList();
    }

    @Override
    public ReportDefinition save(ReportDefinition report) {
        ReportEntity entity = reportMapper.toEntity(report);
        ReportEntity saved = jpaReportRepository.save(entity);
        return reportMapper.toDomain(saved);
    }

    @Override
    public void deleteById(UUID id) {
        jpaReportRepository.deleteById(id);
    }
}
