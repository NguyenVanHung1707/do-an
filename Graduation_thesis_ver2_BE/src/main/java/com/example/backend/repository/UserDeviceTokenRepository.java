package com.example.backend.repository;

import com.example.backend.entity.UserDeviceToken;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserDeviceTokenRepository extends JpaRepository<UserDeviceToken, Long> {
    List<UserDeviceToken> findByKeycloakId(String keycloakId);

    Optional<UserDeviceToken> findByFcmToken(String fcmToken);

    void deleteByFcmTokenAndKeycloakId(String fcmToken, String keycloakId);
}
