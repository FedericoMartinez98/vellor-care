package com.vellor.care.application.computer;

import com.vellor.care.domain.model.Computer;
import com.vellor.care.domain.repository.ComputerRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class GetComputerUseCase {

    private final ComputerRepository computerRepository;

    public Optional<Computer> execute(UUID id) {
        return computerRepository.findById(id);
    }

    public Optional<Computer> executeByAssetTag(String assetTag) {
        return computerRepository.findByAssetTag(assetTag);
    }
}
