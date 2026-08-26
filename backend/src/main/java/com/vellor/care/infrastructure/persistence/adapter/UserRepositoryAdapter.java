package com.vellor.care.infrastructure.persistence.adapter;

import com.vellor.care.domain.model.User;
import com.vellor.care.domain.model.UserRole;
import com.vellor.care.domain.repository.UserRepository;
import com.vellor.care.infrastructure.persistence.entity.UserEntity;
import com.vellor.care.infrastructure.persistence.mapper.UserMapper;
import com.vellor.care.infrastructure.persistence.springdata.JpaUserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Component
@RequiredArgsConstructor
public class UserRepositoryAdapter implements UserRepository {

    private final JpaUserRepository jpaUserRepository;
    private final UserMapper userMapper;

    @Override
    public Optional<User> findById(UUID id) {
        return jpaUserRepository.findById(id)
            .map(userMapper::toDomain);
    }

    @Override
    public Optional<User> findByEmail(String email) {
        return jpaUserRepository.findByEmail(email)
            .map(userMapper::toDomain);
    }

    @Override
    public Optional<User> findByAdObjectGuid(String adObjectGuid) {
        return jpaUserRepository.findByAdObjectGuid(adObjectGuid)
            .map(userMapper::toDomain);
    }

    @Override
    public List<User> findAll() {
        return jpaUserRepository.findAll().stream()
            .map(userMapper::toDomain)
            .toList();
    }

    @Override
    public List<User> findByRole(UserRole role) {
        return jpaUserRepository.findByRole(role).stream()
            .map(userMapper::toDomain)
            .toList();
    }

    @Override
    public User save(User user) {
        UserEntity entity = userMapper.toEntity(user);
        UserEntity saved = jpaUserRepository.save(entity);
        return userMapper.toDomain(saved);
    }

    @Override
    public void deleteById(UUID id) {
        jpaUserRepository.deleteById(id);
    }

    @Override
    public long count() {
        return jpaUserRepository.count();
    }
}
