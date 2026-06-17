package com.example.backend.repository;

import com.example.backend.entity.DeviceToken;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface DeviceTokenRepository extends JpaRepository<DeviceToken, Long> {
    List<DeviceToken> findByKeycloakId(String keycloakId);
    Optional<DeviceToken> findByToken(String token);
}
