package com.vellor.care.interfaces.rest.controller;

import com.vellor.care.application.auth.AuthenticateUserUseCase;
import com.vellor.care.application.auth.RefreshTokenUseCase;
import com.vellor.care.domain.model.User;
import com.vellor.care.domain.repository.UserRepository;
import com.vellor.care.infrastructure.security.JwtService;
import com.vellor.care.interfaces.rest.dto.request.LoginRequest;
import com.vellor.care.interfaces.rest.dto.request.RefreshTokenRequest;
import com.vellor.care.interfaces.rest.dto.response.AuthResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
@Tag(name = "Autenticação", description = "Endpoints de login, renovação de token e perfil do usuário logado.")
public class AuthController {

    private final AuthenticateUserUseCase authenticateUserUseCase;
    private final RefreshTokenUseCase refreshTokenUseCase;
    private final UserRepository userRepository;
    private final JwtService jwtService;

    @PostMapping("/login")
    @Operation(summary = "Autenticar usuário", description = "Realiza login com e-mail e senha, retornando token JWT e refresh token.")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest request) {
        User user = authenticateUserUseCase.execute(request.email(), request.password());
        String token = jwtService.generateToken(user);
        String refreshToken = refreshTokenUseCase.createRefreshToken(user.id(), 30L * 24 * 3600); // 30 dias

        AuthResponse.UserDTO userDTO = new AuthResponse.UserDTO(
            user.id(),
            user.name(),
            user.email(),
            user.role(),
            user.sectorId(),
            user.avatarUrl()
        );

        return ResponseEntity.ok(new AuthResponse(token, refreshToken, "Bearer", 28800L, userDTO));
    }

    @PostMapping("/refresh")
    @Operation(summary = "Renovar token JWT", description = "Obtém um novo token JWT a partir de um refresh token válido.")
    public ResponseEntity<AuthResponse> refresh(@Valid @RequestBody RefreshTokenRequest request) {
        User user = refreshTokenUseCase.execute(request.refreshToken());
        String token = jwtService.generateToken(user);
        String newRefreshToken = refreshTokenUseCase.createRefreshToken(user.id(), 30L * 24 * 3600);

        AuthResponse.UserDTO userDTO = new AuthResponse.UserDTO(
            user.id(),
            user.name(),
            user.email(),
            user.role(),
            user.sectorId(),
            user.avatarUrl()
        );

        return ResponseEntity.ok(new AuthResponse(token, newRefreshToken, "Bearer", 28800L, userDTO));
    }

    @GetMapping("/me")
    @Operation(summary = "Perfil do usuário logado", description = "Retorna os dados do usuário autenticado.")
    public ResponseEntity<User> me(@AuthenticationPrincipal String email) {
        if (email == null) {
            return ResponseEntity.status(401).build();
        }
        return userRepository.findByEmail(email)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }
}
