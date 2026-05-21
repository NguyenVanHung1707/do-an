package com.example.backend.controller;

import jakarta.annotation.security.PermitAll;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class CheckHeathController {
    @GetMapping("/api/user/check")
    public String helloUser(@AuthenticationPrincipal Jwt jwt) {
        return String.format("Hello, %s!", jwt.getClaimAsString("preferred_username"));
    }
    @GetMapping("/api/admin/check")
    public String helloAdmin(@AuthenticationPrincipal Jwt jwt) {
        return String.format("Hello 1, %s!", jwt.getClaimAsString("preferred_username"));
    }
    @GetMapping("/api/user/getCurrentUserName")
    public String getCurrentUserName(@AuthenticationPrincipal Jwt jwt) {
        jwt.getId();
        return jwt.getSubject();
    }
    @PermitAll
    @GetMapping("/api/public/1")
    public String testPublic() {
        return "This is a public endpoint";
    }
}
