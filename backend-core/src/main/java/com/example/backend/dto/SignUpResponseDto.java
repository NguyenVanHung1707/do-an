package com.example.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class SignUpResponseDto {
    private String userIdKeycloak;
    private String username;
    private String email;
    private String firstName;
    private String lastName;
    private String realm;
}
