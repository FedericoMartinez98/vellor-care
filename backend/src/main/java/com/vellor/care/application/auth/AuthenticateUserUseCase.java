package com.vellor.care.application.auth;

import com.vellor.care.domain.model.User;
import com.vellor.care.domain.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;

@Service
@RequiredArgsConstructor
public class AuthenticateUserUseCase {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Transactional
    public User execute(String email, String rawPassword) {
        User user = userRepository.findByEmail(email.trim().toLowerCase())
            .orElseThrow(() -> new IllegalArgumentException("Credenciais inválidas."));

        if (!user.active()) {
            throw new IllegalStateException("Usuário inativo. Contate o administrador.");
        }

        if (!passwordEncoder.matches(rawPassword, user.passwordHash())) {
            throw new IllegalArgumentException("Credenciais inválidas.");
        }

        User withLogin = new User(
            user.id(),
            user.name(),
            user.email(),
            user.passwordHash(),
            user.role(),
            user.sectorId(),
            user.sectorName(),
            user.avatarUrl(),
            user.phone(),
            user.active(),
            user.adObjectGuid(),
            user.adUpn(),
            Instant.now(),
            user.permissions(),
            user.createdAt(),
            Instant.now()
        );

        return userRepository.save(withLogin);
    }
}
