package com.example.backend.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;

import java.io.IOException;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArraySet;

@Component
public class WebSocketSessionManager {
    private final Map<Long, Set<WebSocketSession>> courseSessions = new ConcurrentHashMap<>();
    private final ObjectMapper objectMapper;

    public WebSocketSessionManager() {
        this.objectMapper = new ObjectMapper();
        this.objectMapper.registerModule(new JavaTimeModule()); // Hỗ trợ serialize OffsetDateTime của Java 8
    }

    public void addSession(Long courseId, WebSocketSession session) {
        courseSessions.computeIfAbsent(courseId, k -> new CopyOnWriteArraySet<>()).add(session);
    }

    public void removeSession(Long courseId, WebSocketSession session) {
        Set<WebSocketSession> sessions = courseSessions.get(courseId);
        if (sessions != null) {
            sessions.remove(session);
            if (sessions.isEmpty()) {
                courseSessions.remove(courseId);
            }
        }
    }

    public void removeSessionGlobal(WebSocketSession session) {
        courseSessions.forEach((courseId, sessions) -> {
            if (sessions.remove(session)) {
                if (sessions.isEmpty()) {
                    courseSessions.remove(courseId);
                }
            }
        });
    }

    public void broadcastToCourse(Long courseId, String eventType, Object data) {
        Set<WebSocketSession> sessions = courseSessions.get(courseId);
        if (sessions == null || sessions.isEmpty()) {
            return;
        }

        Map<String, Object> payload = new HashMap<>();
        payload.put("type", eventType);
        payload.put("data", data);

        try {
            String jsonMessage = objectMapper.writeValueAsString(payload);
            TextMessage textMessage = new TextMessage(jsonMessage);

            List<WebSocketSession> closedSessions = new ArrayList<>();
            for (WebSocketSession session : sessions) {
                if (session.isOpen()) {
                    synchronized (session) {
                        try {
                            session.sendMessage(textMessage);
                        } catch (IOException e) {
                            closedSessions.add(session);
                        }
                    }
                } else {
                    closedSessions.add(session);
                }
            }

            // Cleanup closed sessions
            for (WebSocketSession closedSession : closedSessions) {
                removeSession(courseId, closedSession);
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}
