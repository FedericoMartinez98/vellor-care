package com.vellor.care.infrastructure.persistence.springdata;

import com.vellor.care.domain.model.UserRole;
import com.vellor.care.infrastructure.persistence.entity.UserEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface JpaUserRepository extends JpaRepository<UserEntity, UUID> {

    Optional<UserEntity> findByEmail(String email);

    Optional<UserEntity> findByAdObjectGuid(String adObjectGuid);

    List<UserEntity> findByRole(UserRole role);
}
