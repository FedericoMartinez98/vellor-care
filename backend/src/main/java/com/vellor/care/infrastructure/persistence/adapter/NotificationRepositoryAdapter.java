package com.vellor.care.infrastructure.persistence.adapter;

import com.vellor.care.domain.model.AppNotification;
import com.vellor.care.domain.repository.NotificationRepository;
import com.vellor.care.infrastructure.persistence.entity.NotificationEntity;
import com.vellor.care.infrastructure.persistence.mapper.NotificationMapper;
import com.vellor.care.infrastructure.persistence.springdata.JpaNotificationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Component
@RequiredArgsConstructor
public class NotificationRepositoryAdapter implements NotificationRepository {

    private final JpaNotificationRepository jpaNotificationRepository;
    private final NotificationMapper notificationMapper;

    @Override
    public Optional<AppNotification> findById(UUID id) {
        return jpaNotificationRepository.findById(id)
            .map(notificationMapper::toDomain);
    }

    @Override
    public Optional<AppNotification> findByDedupKey(String dedupKey) {
        return jpaNotificationRepository.findByDedupKey(dedupKey)
            .map(notificationMapper::toDomain);
    }

    @Override
    public List<AppNotification> findAll() {
        return jpaNotificationRepository.findAll().stream()
            .map(notificationMapper::toDomain)
            .toList();
    }

    @Override
    public List<AppNotification> findByUserId(UUID userId) {
        return jpaNotificationRepository.findByUserId(userId).stream()
            .map(notificationMapper::toDomain)
            .toList();
    }

    @Override
    public List<AppNotification> findUnreadByUserId(UUID userId) {
        return jpaNotificationRepository.findUnreadByUserId(userId).stream()
            .map(notificationMapper::toDomain)
            .toList();
    }

    @Override
    public long countUnreadByUserId(UUID userId) {
        return jpaNotificationRepository.countUnreadByUserId(userId);
    }

    @Override
    public AppNotification save(AppNotification notification) {
        NotificationEntity entity = notificationMapper.toEntity(notification);
        NotificationEntity saved = jpaNotificationRepository.save(entity);
        return notificationMapper.toDomain(saved);
    }

    @Override
    @Transactional
    public void markAllReadByUserId(UUID userId) {
        jpaNotificationRepository.markAllReadByUserId(userId);
    }

    @Override
    public void deleteById(UUID id) {
        jpaNotificationRepository.deleteById(id);
    }

    @Override
    public long count() {
        return jpaNotificationRepository.count();
    }
}
