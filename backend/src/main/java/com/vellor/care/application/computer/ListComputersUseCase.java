package com.vellor.care.application.computer;

import com.vellor.care.domain.model.Computer;
import com.vellor.care.domain.model.ComputerStatus;
import com.vellor.care.domain.repository.ComputerRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ListComputersUseCase {

    private final ComputerRepository computerRepository;

    public List<Computer> executeAll() {
        return computerRepository.findAll();
    }

    public List<Computer> executeBySector(UUID sectorId) {
        return computerRepository.findBySectorId(sectorId);
    }

    public List<Computer> executeByStatus(ComputerStatus status) {
        return computerRepository.findByStatus(status);
    }

    public List<Computer> executeSearch(String query) {
        if (query == null || query.isBlank()) {
            return computerRepository.findAll();
        }
        return computerRepository.search(query.trim());
    }
}
