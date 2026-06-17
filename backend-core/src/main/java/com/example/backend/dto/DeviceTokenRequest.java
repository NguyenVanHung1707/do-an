package com.example.backend.dto;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class DeviceTokenRequest {
    private String fcmToken;
    private String token;
    private String deviceType;
    private String deviceId;

    public String resolveToken() {
        return fcmToken != null && !fcmToken.isBlank() ? fcmToken : token;
    }
}
