package com.vellor.care.application.auth;

import com.vellor.care.domain.model.User;
import com.vellor.care.domain.repository.UserRepository;
import com.vellor.care.infrastructure.persistence.entity.RefreshTokenEntity;
import com.vellor.care.infrastructure.persistence.springdata.JpaRefreshTokenRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class RefreshTokenUseCase {

    private final JpaRefreshTokenRepository jpaRefreshTokenRepository;
    private final UserRepository userRepository;

    @Transactional
    public User execute(String refreshToken) {
        RefreshTokenEntity entity = jpaRefreshTokenRepository.findByToken(refreshToken)
            .orElseThrow(() -> new IllegalArgumentException("Refresh token inválido."));

        if (entity.isRevoked() || entity.getExpiresAt().isBefore(Instant.now())) {
            throw new IllegalStateException("Refresh token expirado ou revogado.");
        }

        return userRepository.findById(entity.getUserId())
            .orElseThrow(() -> new IllegalArgumentException("Usuário associado não encontrado."));
    }

    @Transactional
    public String createRefreshToken(UUID userId, long durationSeconds) {
        String token = UUID.randomUUID().toString();
        RefreshTokenEntity entity = RefreshTokenEntity.builder()
            .id(UUID.randomUUID())
            .userId(userId)
            .token(token)
            .expiresAt(Instant.now().plusSeconds(durationSeconds))
            .revoked(false)
            .createdAt(Instant.now())
            .build();
        jpaRefreshTokenRepository.save(entity);
        return token;
    }
}
