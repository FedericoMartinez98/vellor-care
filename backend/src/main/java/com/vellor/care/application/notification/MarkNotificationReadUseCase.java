package com.vellor.care.application.notification;

import com.vellor.care.domain.model.AppNotification;
import com.vellor.care.domain.repository.NotificationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class MarkNotificationReadUseCase {

    private final NotificationRepository notificationRepository;

    @Transactional
    public void execute(UUID notificationId) {
        notificationRepository.findById(notificationId).ifPresent(n -> {
            AppNotification readNotification = new AppNotification(
                n.id(),
                n.type(),
                n.severity(),
                n.title(),
                n.message(),
                n.computerId(),
                n.maintenanceId(),
                n.partId(),
                n.targetUserId(),
                n.href(),
                true,
                n.dedupKey(),
                n.createdAt()
            );
            notificationRepository.save(readNotification);
        });
    }

    @Transactional
    public void executeAll(UUID userId) {
        notificationRepository.markAllReadByUserId(userId);
    }
}
