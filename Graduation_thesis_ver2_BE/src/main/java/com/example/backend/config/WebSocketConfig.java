package com.example.backend.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.socket.config.annotation.EnableWebSocket;
import org.springframework.web.socket.config.annotation.WebSocketConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketHandlerRegistry;

@Configuration
@EnableWebSocket
public class WebSocketConfig implements WebSocketConfigurer {
    private final DiscussionWebSocketHandler discussionWebSocketHandler;

    public WebSocketConfig(DiscussionWebSocketHandler discussionWebSocketHandler) {
        this.discussionWebSocketHandler = discussionWebSocketHandler;
    }

    @Override
    public void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {
        registry.addHandler(discussionWebSocketHandler, "/ws/discussion")
                .setAllowedOrigins("*");
    }
}
