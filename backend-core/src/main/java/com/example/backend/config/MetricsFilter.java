package com.example.backend.config;

import com.example.backend.entity.SystemVisitLog;
import com.example.backend.repository.SystemVisitLogRepository;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.Instant;
import java.util.concurrent.CompletableFuture;

@Component
@RequiredArgsConstructor
@Slf4j
public class MetricsFilter extends OncePerRequestFilter {

    private final SystemVisitLogRepository systemVisitLogRepository;

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        
        String uri = request.getRequestURI();
        String method = request.getMethod();

        // Chỉ ghi nhận cuộc gọi API thực tế, bỏ qua preflight OPTIONS và endpoint /error
        if (!uri.startsWith("/api") || "OPTIONS".equalsIgnoreCase(method) || uri.contains("/error")) {
            filterChain.doFilter(request, response);
            return;
        }

        long startTime = System.currentTimeMillis();

        try {
            filterChain.doFilter(request, response);
        } finally {
            long duration = System.currentTimeMillis() - startTime;
            int status = response.getStatus();
            
            // Trích xuất IP thật của Client đằng sau Nginx Reverse Proxy
            String ip = request.getHeader("X-Forwarded-For");
            if (ip == null || ip.isEmpty() || "unknown".equalsIgnoreCase(ip)) {
                ip = request.getRemoteAddr();
            } else {
                int commaIndex = ip.indexOf(',');
                if (commaIndex != -1) {
                    ip = ip.substring(0, commaIndex).trim();
                }
            }

            final String clientIp = ip;
            
            // Lưu bất đồng bộ để tối ưu thời gian phản hồi cho client
            CompletableFuture.runAsync(() -> {
                try {
                    SystemVisitLog visitLog = SystemVisitLog.builder()
                            .ipAddress(clientIp)
                            .requestUri(uri)
                            .statusCode(status)
                            .responseTimeMs(duration)
                            .timestamp(Instant.now())
                            .build();
                    systemVisitLogRepository.save(visitLog);
                } catch (Exception e) {
                    log.error("Lỗi lưu SystemVisitLog: ", e);
                }
            });
        }
    }
}
