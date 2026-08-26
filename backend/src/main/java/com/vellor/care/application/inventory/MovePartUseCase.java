package com.vellor.care.application.inventory;

import com.vellor.care.domain.model.InventoryMovement;
import com.vellor.care.domain.model.InventoryPart;
import com.vellor.care.domain.model.MovementType;
import com.vellor.care.domain.model.User;
import com.vellor.care.domain.repository.InventoryMovementRepository;
import com.vellor.care.domain.repository.InventoryPartRepository;
import com.vellor.care.domain.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class MovePartUseCase {

    private final InventoryPartRepository partRepository;
    private final InventoryMovementRepository movementRepository;
    private final UserRepository userRepository;

    @Transactional
    public InventoryMovement execute(MovePartCommand command) {
        InventoryPart part = partRepository.findById(command.partId())
            .orElseThrow(() -> new IllegalArgumentException("Peça não encontrada: " + command.partId()));

        User user = userRepository.findById(command.userId())
            .orElseThrow(() -> new IllegalArgumentException("Usuário não encontrado: " + command.userId()));

        int newQuantity = part.quantity();
        if (command.type() == MovementType.ENTRADA) {
            newQuantity += command.quantity();
        } else if (command.type() == MovementType.SAIDA || command.type() == MovementType.DESCARTE) {
            newQuantity -= command.quantity();
            if (newQuantity < 0) {
                throw new IllegalStateException("Saldo insuficiente em estoque. Saldo atual: " + part.quantity());
            }
        } else if (command.type() == MovementType.AJUSTE) {
            newQuantity = command.quantity();
        }

        Instant now = Instant.now();

        // Atualiza a peça
        InventoryPart updatedPart = new InventoryPart(
            part.id(),
            part.sku(),
            part.name(),
            part.category(),
            newQuantity,
            part.minimumQuantity(),
            part.unit(),
            part.supplier(),
            part.unitValue(),
            part.location(),
            part.notes(),
            part.createdAt(),
            now
        );
        partRepository.save(updatedPart);

        // Registra a movimentação
        InventoryMovement movement = new InventoryMovement(
            UUID.randomUUID(),
            part.id(),
            part.name(),
            command.type(),
            command.quantity(),
            newQuantity,
            null,
            null,
            user.id(),
            user.name(),
            command.reason(),
            now
        );

        return movementRepository.save(movement);
    }

    public record MovePartCommand(
        UUID partId,
        UUID userId,
        MovementType type,
        int quantity,
        String reason
    ) {}
}
