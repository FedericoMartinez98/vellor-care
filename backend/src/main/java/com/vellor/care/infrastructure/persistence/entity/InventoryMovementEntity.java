package com.vellor.care.infrastructure.persistence.entity;

import com.vellor.care.domain.model.MovementType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "inventory_movements")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class InventoryMovementEntity {

    @Id
    @Column(name = "id", nullable = false)
    private UUID id;

    @Column(name = "part_id", nullable = false)
    private UUID partId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "part_id", insertable = false, updatable = false)
    private InventoryPartEntity part;

    // Nome da peca no momento do movimento (historico nao muda se a peca for
    // renomeada depois). Coluna NOT NULL que nao estava mapeada aqui -- o
    // INSERT saia sem ela e toda baixa de estoque falhava.
    @Column(name = "part_name", nullable = false, length = 160)
    private String partName;

    @Enumerated(EnumType.STRING)
    @Column(name = "type", nullable = false, length = 20)
    private MovementType type;

    @Column(name = "quantity", nullable = false)
    private int quantity;

    @Column(name = "balance_after", nullable = false)
    private int balanceAfter;

    @Column(name = "maintenance_id")
    private UUID maintenanceId;

    /** Patrimonio do equipamento, quando o movimento vem de uma manutencao. */
    @Column(name = "computer_asset_tag", length = 40)
    private String computerAssetTag;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", insertable = false, updatable = false)
    private UserEntity user;

    /** Nome de quem executou, congelado no historico. Coluna NOT NULL. */
    @Column(name = "user_name", nullable = false, length = 120)
    private String userName;

    @Column(name = "reason", columnDefinition = "TEXT")
    private String reason;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;
}
