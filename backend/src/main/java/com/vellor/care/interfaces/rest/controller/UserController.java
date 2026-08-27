package com.vellor.care.interfaces.rest.controller;

import com.vellor.care.domain.model.User;
import com.vellor.care.domain.model.UserRole;
import com.vellor.care.domain.repository.UserRepository;
import com.vellor.care.interfaces.rest.dto.request.UserCreateRequest;
import com.vellor.care.interfaces.rest.dto.response.UserResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.Collections;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/users")
@RequiredArgsConstructor
@Tag(name = "Usuários", description = "Gestão de operadores e equipe de TI.")
public class UserController {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @GetMapping
    @Operation(summary = "Listar usuários", description = "Retorna os usuários cadastrados com filtro opcional por papel.")
    @Transactional(readOnly = true)
    public ResponseEntity<List<UserResponse>> list(@RequestParam(required = false) UserRole role) {
        List<User> users = role != null ? userRepository.findByRole(role) : userRepository.findAll();
        return ResponseEntity.ok(users.stream().map(UserResponse::from).toList());
    }

    @GetMapping("/{id}")
    @Operation(summary = "Consultar usuário por ID", description = "Retorna detalhes de um usuário.")
    @Transactional(readOnly = true)
    public ResponseEntity<UserResponse> getById(@PathVariable UUID id) {
        return userRepository.findById(id)
            .map(UserResponse::from)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    @Operation(summary = "Cadastrar usuário", description = "Cria um novo operador ou técnico de TI.")
    @PreAuthorize("hasRole('ADMINISTRADOR')")
    @Transactional
    public ResponseEntity<UserResponse> create(@Valid @RequestBody UserCreateRequest request) {
        if (userRepository.findByEmail(request.email().trim().toLowerCase()).isPresent()) {
            throw new IllegalArgumentException("Já existe um usuário com o e-mail: " + request.email());
        }

        // Sem senha explicita o cadastro e recusado. Antes caia num
        // "password123" silencioso, criando conta com senha conhecida.
        if (request.password() == null || request.password().isBlank()) {
            throw new IllegalArgumentException("Senha é obrigatória para criar um usuário.");
        }
        if (request.password().length() < 8) {
            throw new IllegalArgumentException("A senha deve ter ao menos 8 caracteres.");
        }

        UUID id = UUID.randomUUID();
        Instant now = Instant.now();
        String pwd = request.password();

        User user = new User(
            id,
            request.name().trim(),
            request.email().trim().toLowerCase(),
            passwordEncoder.encode(pwd),
            request.role(),
            request.sectorId(),
            null,
            null,
            request.phone(),
            request.active(),
            null,
            null,
            null,
            Collections.emptyList(),
            now,
            now
        );

        return ResponseEntity.status(HttpStatus.CREATED).body(UserResponse.from(userRepository.save(user)));
    }

    @PutMapping("/{id}")
    @Operation(summary = "Atualizar usuário", description = "Altera os dados cadastrais ou perfil do usuário.")
    @PreAuthorize("hasRole('ADMINISTRADOR')")
    @Transactional
    public ResponseEntity<UserResponse> update(@PathVariable UUID id, @Valid @RequestBody UserCreateRequest request) {
        User existing = userRepository.findById(id)
            .orElseThrow(() -> new IllegalArgumentException("Usuário não encontrado: " + id));

        // Senha em branco mantem a atual; se vier preenchida, precisa ser valida.
        String pwdHash = existing.passwordHash();
        if (request.password() != null && !request.password().isBlank()) {
            if (request.password().length() < 8) {
                throw new IllegalArgumentException("A senha deve ter ao menos 8 caracteres.");
            }
            pwdHash = passwordEncoder.encode(request.password());
        }

        User updated = new User(
            existing.id(),
            request.name().trim(),
            request.email().trim().toLowerCase(),
            pwdHash,
            request.role(),
            request.sectorId(),
            existing.sectorName(),
            existing.avatarUrl(),
            request.phone(),
            request.active(),
            existing.adObjectGuid(),
            existing.adUpn(),
            existing.lastLoginAt(),
            existing.permissions(),
            existing.createdAt(),
            Instant.now()
        );

        return ResponseEntity.ok(UserResponse.from(userRepository.save(updated)));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Excluir usuário", description = "Remove o cadastro de um usuário.")
    @PreAuthorize("hasRole('ADMINISTRADOR')")
    @Transactional
    public ResponseEntity<Void> delete(@PathVariable UUID id, @AuthenticationPrincipal String email) {
        // Evita o administrador se excluir e deixar o sistema sem acesso.
        userRepository.findByEmail(email)
            .filter(current -> current.id().equals(id))
            .ifPresent(current -> {
                throw new IllegalArgumentException("Você não pode excluir o próprio usuário.");
            });

        userRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}
