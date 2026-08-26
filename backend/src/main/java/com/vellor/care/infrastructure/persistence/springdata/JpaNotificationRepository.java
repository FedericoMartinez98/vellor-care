package com.vellor.care.infrastructure.persistence.springdata;

import com.vellor.care.infrastructure.persistence.entity.NotificationEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface JpaNotificationRepository extends JpaRepository<NotificationEntity, UUID> {

    Optional<NotificationEntity> findByDedupKey(String dedupKey);

    @Query("SELECT n FROM NotificationEntity n WHERE n.targetUserId = :userId OR n.targetUserId IS NULL ORDER BY n.createdAt DESC")
    List<NotificationEntity> findByUserId(@Param("userId") UUID userId);

    @Query("SELECT n FROM NotificationEntity n WHERE (n.targetUserId = :userId OR n.targetUserId IS NULL) AND n.read = false ORDER BY n.createdAt DESC")
    List<NotificationEntity> findUnreadByUserId(@Param("userId") UUID userId);

    @Query("SELECT COUNT(n) FROM NotificationEntity n WHERE (n.targetUserId = :userId OR n.targetUserId IS NULL) AND n.read = false")
    long countUnreadByUserId(@Param("userId") UUID userId);

    @Modifying
    @Query("UPDATE NotificationEntity n SET n.read = true WHERE (n.targetUserId = :userId OR n.targetUserId IS NULL) AND n.read = false")
    void markAllReadByUserId(@Param("userId") UUID userId);
}
