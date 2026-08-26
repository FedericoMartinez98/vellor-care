package com.vellor.care.application.notification;

import com.vellor.care.domain.model.AppNotification;
import com.vellor.care.domain.repository.NotificationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ListNotificationsUseCase {

    private final NotificationRepository notificationRepository;

    public List<AppNotification> executeByUserId(UUID userId) {
        return notificationRepository.findByUserId(userId);
    }

    public List<AppNotification> executeUnreadByUserId(UUID userId) {
        return notificationRepository.findUnreadByUserId(userId);
    }

    public long countUnreadByUserId(UUID userId) {
        return notificationRepository.countUnreadByUserId(userId);
    }
}
