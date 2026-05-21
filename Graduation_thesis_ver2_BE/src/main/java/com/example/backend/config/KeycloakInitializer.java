package com.example.backend.config;

import jakarta.ws.rs.core.Response;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.keycloak.OAuth2Constants;
import org.keycloak.admin.client.CreatedResponseUtil;
import org.keycloak.admin.client.Keycloak;
import org.keycloak.admin.client.KeycloakBuilder;
import org.keycloak.admin.client.resource.UsersResource;
import org.keycloak.representations.idm.CredentialRepresentation;
import org.keycloak.representations.idm.RoleRepresentation;
import org.keycloak.representations.idm.UserRepresentation;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
public class KeycloakInitializer implements CommandLineRunner {

    private final KeycloakConfig keycloakConfig;

    @Override
    public void run(String... args) throws Exception {
        log.info("=== BẮT ĐẦU KIỂM TRA & KHỞI TẠO TÀI KHOẢN ADMIN TRÊN KEYCLOAK ===");
        try {
            // Khởi tạo Keycloak Client kết nối tới Master Realm để quản lý User của Realm chính
            Keycloak keycloak = KeycloakBuilder.builder()
                    .serverUrl(keycloakConfig.getServerUrl())
                    .realm("master")
                    .grantType(OAuth2Constants.PASSWORD)
                    .clientId("admin-cli")
                    .username(keycloakConfig.getAdminUsername())
                    .password(keycloakConfig.getAdminPassword())
                    .build();

            UsersResource usersResource = keycloak.realm(keycloakConfig.getRealm()).users();
            
            // Tìm kiếm xem đã có user tên 'admin' hay chưa
            List<UserRepresentation> existing = usersResource.searchByUsernameOrEmail("admin", true);
            
            if (existing.isEmpty()) {
                log.info("Chưa tìm thấy tài khoản Admin trong realm: '{}'. Tiến hành tạo mới...", keycloakConfig.getRealm());
                
                UserRepresentation adminUser = new UserRepresentation();
                adminUser.setEnabled(true);
                adminUser.setUsername("admin");
                adminUser.setEmail("admin@example.com");
                adminUser.setFirstName("System");
                adminUser.setLastName("Admin");
                adminUser.setEmailVerified(true);

                // Cấu hình mật khẩu cố định
                CredentialRepresentation credential = new CredentialRepresentation();
                credential.setValue("Password123!");
                credential.setTemporary(false);
                credential.setType(CredentialRepresentation.PASSWORD);
                adminUser.setCredentials(List.of(credential));

                // Tạo User trên Keycloak
                Response response = usersResource.create(adminUser);
                
                if (response.getStatus() == 201) {
                    String adminId = CreatedResponseUtil.getCreatedId(response);
                    
                    // Lấy Role đại diện cho 'admin' trong Realm
                    RoleRepresentation adminRole = keycloak.realm(keycloakConfig.getRealm()).roles().get("admin").toRepresentation();
                    
                    // Gán quyền admin
                    usersResource.get(adminId).roles().realmLevel().add(List.of(adminRole));
                    
                    log.info("=== ĐÃ TẠO THÀNH CÔNG TÀI KHOẢN ADMIN: ===");
                    log.info("Email: admin@example.com");
                    log.info("Username: admin");
                    log.info("Password: Password123!");
                    log.info("Role: admin");
                } else {
                    log.error("Tạo tài khoản Admin thất bại. Mã lỗi Keycloak: {}", response.getStatus());
                }
            } else {
                log.info("Tài khoản Admin đã tồn tại trong realm: '{}'. Bỏ qua tự động khởi tạo.", keycloakConfig.getRealm());
            }
        } catch (Exception e) {
            log.error("Không thể tự động khởi tạo tài khoản admin trên Keycloak (Có thể do Keycloak chưa được bật): {}", e.getMessage());
        }
    }
}
