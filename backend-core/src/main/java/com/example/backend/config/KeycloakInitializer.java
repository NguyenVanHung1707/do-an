package com.example.backend.config;

import jakarta.ws.rs.core.Response;
import java.util.List;
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
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

@Component
@RequiredArgsConstructor
@Slf4j
public class KeycloakInitializer implements CommandLineRunner {

    private final KeycloakConfig keycloakConfig;

    @Value("${app.bootstrap.admin.enabled:false}")
    private boolean bootstrapAdminEnabled;

    @Value("${app.bootstrap.admin.username:admin}")
    private String bootstrapAdminUsername;

    @Value("${app.bootstrap.admin.email:admin_system@example.com}")
    private String bootstrapAdminEmail;

    @Value("${app.bootstrap.admin.first-name:System}")
    private String bootstrapAdminFirstName;

    @Value("${app.bootstrap.admin.last-name:Admin}")
    private String bootstrapAdminLastName;

    @Value("${app.bootstrap.admin.password:}")
    private String bootstrapAdminPassword;

    @Override
    public void run(String... args) {
        if (!bootstrapAdminEnabled) {
            log.info("Keycloak bootstrap admin is disabled. Set APP_BOOTSTRAP_ADMIN_ENABLED=true to enable it.");
            return;
        }

        if (!StringUtils.hasText(bootstrapAdminPassword)) {
            log.warn("Keycloak bootstrap admin is enabled but APP_BOOTSTRAP_ADMIN_PASSWORD is empty. Skipping bootstrap.");
            return;
        }

        log.info("Checking Keycloak bootstrap admin account.");
        try {
            Keycloak keycloak = KeycloakBuilder.builder()
                    .serverUrl(keycloakConfig.getServerUrl())
                    .realm("master")
                    .grantType(OAuth2Constants.PASSWORD)
                    .clientId("admin-cli")
                    .username(keycloakConfig.getAdminUsername())
                    .password(keycloakConfig.getAdminPassword())
                    .build();

            UsersResource usersResource = keycloak.realm(keycloakConfig.getRealm()).users();
            List<UserRepresentation> existing = usersResource.search(bootstrapAdminUsername, true);

            if (existing.isEmpty()) {
                log.info("Bootstrap admin '{}' was not found in realm '{}'. Creating it.",
                        bootstrapAdminUsername,
                        keycloakConfig.getRealm());

                UserRepresentation adminUser = new UserRepresentation();
                adminUser.setEnabled(true);
                adminUser.setUsername(bootstrapAdminUsername);
                adminUser.setEmail(bootstrapAdminEmail);
                adminUser.setFirstName(bootstrapAdminFirstName);
                adminUser.setLastName(bootstrapAdminLastName);
                adminUser.setEmailVerified(true);

                CredentialRepresentation credential = new CredentialRepresentation();
                credential.setValue(bootstrapAdminPassword);
                credential.setTemporary(false);
                credential.setType(CredentialRepresentation.PASSWORD);
                adminUser.setCredentials(List.of(credential));

                Response response = usersResource.create(adminUser);

                if (response.getStatus() == 201) {
                    String adminId = CreatedResponseUtil.getCreatedId(response);
                    RoleRepresentation adminRole = keycloak.realm(keycloakConfig.getRealm())
                            .roles()
                            .get("admin")
                            .toRepresentation();

                    usersResource.get(adminId).roles().realmLevel().add(List.of(adminRole));
                    log.info("Created Keycloak bootstrap admin '{}' with role 'admin'.", bootstrapAdminUsername);
                } else {
                    log.error("Failed to create Keycloak bootstrap admin. Keycloak status: {}", response.getStatus());
                }
            } else {
                log.info("Bootstrap admin '{}' already exists in realm '{}'. Skipping bootstrap.",
                        bootstrapAdminUsername,
                        keycloakConfig.getRealm());
            }
        } catch (Exception e) {
            log.error("Could not bootstrap Keycloak admin account: {}", e.getMessage());
        }
    }
}
