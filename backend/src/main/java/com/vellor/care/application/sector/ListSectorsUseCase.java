package com.vellor.care.application.sector;

import com.vellor.care.domain.model.Sector;
import com.vellor.care.domain.repository.SectorRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ListSectorsUseCase {

    private final SectorRepository sectorRepository;

    public List<Sector> executeAll() {
        return sectorRepository.findAll();
    }

    public Optional<Sector> executeById(UUID id) {
        return sectorRepository.findById(id);
    }
}
