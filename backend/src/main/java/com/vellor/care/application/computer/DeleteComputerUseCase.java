package com.vellor.care.application.computer;

import com.vellor.care.domain.model.Computer;
import com.vellor.care.domain.repository.ComputerRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class DeleteComputerUseCase {

    private final ComputerRepository computerRepository;

    @Transactional
    public void execute(UUID id) {
        Computer computer = computerRepository.findById(id)
            .orElseThrow(() -> new IllegalArgumentException("Computador não encontrado: " + id));
        computerRepository.deleteById(computer.id());
    }
}
