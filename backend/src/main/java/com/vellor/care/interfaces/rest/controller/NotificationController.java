package com.vellor.care.interfaces.rest.controller;

import com.vellor.care.application.notification.ListNotificationsUseCase;
import com.vellor.care.application.notification.MarkNotificationReadUseCase;
import com.vellor.care.application.notification.ScanAndGenerateAlertsUseCase;
import com.vellor.care.domain.model.AppNotification;
import com.vellor.care.domain.model.User;
import com.vellor.care.domain.repository.UserRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/notifications")
@RequiredArgsConstructor
@Tag(name = "Notificações e Alertas", description = "Central de notificações operacionais, alertas de estoque e preventivas.")
public class NotificationController {

    private final ListNotificationsUseCase listNotificationsUseCase;
    private final MarkNotificationReadUseCase markNotificationReadUseCase;
    private final ScanAndGenerateAlertsUseCase scanAndGenerateAlertsUseCase;
    private final UserRepository userRepository;

    private UUID resolveUserId(String email) {
        if (email == null) return null;
        return userRepository.findByEmail(email).map(User::id).orElse(null);
    }

    @GetMapping
    @Operation(summary = "Listar notificações", description = "Retorna notificações do usuário ou gerais.")
    public ResponseEntity<List<AppNotification>> list(
        @AuthenticationPrincipal String email,
        @RequestParam(required = false, defaultValue = "false") boolean unreadOnly
    ) {
        UUID userId = resolveUserId(email);
        if (unreadOnly) {
            return ResponseEntity.ok(listNotificationsUseCase.executeUnreadByUserId(userId));
        }
        return ResponseEntity.ok(listNotificationsUseCase.executeByUserId(userId));
    }

    @GetMapping("/unread-count")
    @Operation(summary = "Contador de não lidas", description = "Retorna o total de notificações pendentes.")
    public ResponseEntity<Long> countUnread(@AuthenticationPrincipal String email) {
        UUID userId = resolveUserId(email);
        return ResponseEntity.ok(listNotificationsUseCase.countUnreadByUserId(userId));
    }

    @PutMapping("/{id}/read")
    @Operation(summary = "Marcar como lida", description = "Marca uma notificação específica como lida.")
    public ResponseEntity<Void> markRead(@PathVariable UUID id) {
        markNotificationReadUseCase.execute(id);
        return ResponseEntity.ok().build();
    }

    @PutMapping("/read-all")
    @Operation(summary = "Marcar todas como lidas", description = "Marca todas as notificações do usuário como lidas.")
    public ResponseEntity<Void> markAllRead(@AuthenticationPrincipal String email) {
        UUID userId = resolveUserId(email);
        markNotificationReadUseCase.executeAll(userId);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/scan")
    @Operation(summary = "Executar varredura manual de alertas", description = "Dispara varredura imediata de preventivas e estoque mínimo.")
    public ResponseEntity<Integer> scanNow() {
        int count = scanAndGenerateAlertsUseCase.execute();
        return ResponseEntity.ok(count);
    }
}
