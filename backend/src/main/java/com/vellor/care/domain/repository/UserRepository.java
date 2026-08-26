package com.vellor.care.domain.repository;

import com.vellor.care.domain.model.User;
import com.vellor.care.domain.model.UserRole;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface UserRepository {
    Optional<User> findById(UUID id);
    Optional<User> findByEmail(String email);
    Optional<User> findByAdObjectGuid(String adObjectGuid);
    List<User> findAll();
    List<User> findByRole(UserRole role);
    User save(User user);
    void deleteById(UUID id);
    long count();
}
