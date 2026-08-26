package com.vellor.care.infrastructure.persistence.adapter;

import com.vellor.care.domain.model.Computer;
import com.vellor.care.domain.model.ComputerStatus;
import com.vellor.care.domain.model.HealthSnapshot;
import com.vellor.care.domain.repository.ComputerRepository;
import com.vellor.care.infrastructure.persistence.entity.ComputerEntity;
import com.vellor.care.infrastructure.persistence.mapper.ComputerMapper;
import com.vellor.care.infrastructure.persistence.mapper.HealthMapper;
import com.vellor.care.infrastructure.persistence.springdata.JpaComputerRepository;
import com.vellor.care.infrastructure.persistence.springdata.JpaHealthRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Component
@RequiredArgsConstructor
public class ComputerRepositoryAdapter implements ComputerRepository {

    private final JpaComputerRepository jpaComputerRepository;
    private final JpaHealthRepository jpaHealthRepository;
    private final ComputerMapper computerMapper;
    private final HealthMapper healthMapper;

    private HealthSnapshot findLatestHealth(UUID computerId) {
        return jpaHealthRepository.findLatestByComputerId(computerId)
            .map(healthMapper::toDomain)
            .orElse(null);
    }

    @Override
    public Optional<Computer> findById(UUID id) {
        return jpaComputerRepository.findById(id)
            .map(entity -> computerMapper.toDomain(entity, findLatestHealth(id)));
    }

    @Override
    public Optional<Computer> findByAssetTag(String assetTag) {
        return jpaComputerRepository.findByAssetTag(assetTag)
            .map(entity -> computerMapper.toDomain(entity, findLatestHealth(entity.getId())));
    }

    @Override
    public Optional<Computer> findByHostname(String hostname) {
        return jpaComputerRepository.findByHostname(hostname)
            .map(entity -> computerMapper.toDomain(entity, findLatestHealth(entity.getId())));
    }

    @Override
    public Optional<Computer> findBySerialNumber(String serialNumber) {
        return jpaComputerRepository.findBySerialNumber(serialNumber)
            .map(entity -> computerMapper.toDomain(entity, findLatestHealth(entity.getId())));
    }

    @Override
    public List<Computer> findAll() {
        return jpaComputerRepository.findAll().stream()
            .map(entity -> computerMapper.toDomain(entity, findLatestHealth(entity.getId())))
            .toList();
    }

    @Override
    public List<Computer> findBySectorId(UUID sectorId) {
        return jpaComputerRepository.findBySectorId(sectorId).stream()
            .map(entity -> computerMapper.toDomain(entity, findLatestHealth(entity.getId())))
            .toList();
    }

    @Override
    public List<Computer> findByStatus(ComputerStatus status) {
        return jpaComputerRepository.findByStatus(status).stream()
            .map(entity -> computerMapper.toDomain(entity, findLatestHealth(entity.getId())))
            .toList();
    }

    @Override
    public List<Computer> findOverdueMaintenances(LocalDate date) {
        return jpaComputerRepository.findOverdueMaintenances(date).stream()
            .map(entity -> computerMapper.toDomain(entity, findLatestHealth(entity.getId())))
            .toList();
    }

    @Override
    public List<Computer> search(String query) {
        return jpaComputerRepository.search(query).stream()
            .map(entity -> computerMapper.toDomain(entity, findLatestHealth(entity.getId())))
            .toList();
    }

    @Override
    public Computer save(Computer computer) {
        ComputerEntity entity = computerMapper.toEntity(computer);
        ComputerEntity saved = jpaComputerRepository.save(entity);
        return computerMapper.toDomain(saved, computer.latestHealth());
    }

    @Override
    public void deleteById(UUID id) {
        jpaComputerRepository.deleteById(id);
    }

    @Override
    public long count() {
        return jpaComputerRepository.count();
    }
}
