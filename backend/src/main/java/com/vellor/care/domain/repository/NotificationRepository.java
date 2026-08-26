package com.vellor.care.domain.repository;

import com.vellor.care.domain.model.AppNotification;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface NotificationRepository {
    Optional<AppNotification> findById(UUID id);
    Optional<AppNotification> findByDedupKey(String dedupKey);
    List<AppNotification> findAll();
    List<AppNotification> findByUserId(UUID userId);
    List<AppNotification> findUnreadByUserId(UUID userId);
    long countUnreadByUserId(UUID userId);
    AppNotification save(AppNotification notification);
    void markAllReadByUserId(UUID userId);
    void deleteById(UUID id);
}
