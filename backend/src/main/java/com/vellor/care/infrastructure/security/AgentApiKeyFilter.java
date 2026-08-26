package com.vellor.care.infrastructure.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Collections;

@Component
public class AgentApiKeyFilter extends OncePerRequestFilter {

    @Value("${vellor.agent.api-key:vellor-agent-secret-api-key-2026}")
    private String configuredApiKey;

    @Override
    protected void doFilterInternal(
        HttpServletRequest request,
        HttpServletResponse response,
        FilterChain filterChain
    ) throws ServletException, IOException {
        String path = request.getRequestURI();

        if (path.startsWith("/api/v1/agent/") || path.startsWith("/api/agent/")) {
            String apiKeyHeader = request.getHeader("X-Agent-Api-Key");
            if (apiKeyHeader != null && apiKeyHeader.equals(configuredApiKey)) {
                var auth = new UsernamePasswordAuthenticationToken(
                    "WINDOWS_AGENT",
                    null,
                    Collections.singletonList(new SimpleGrantedAuthority("ROLE_AGENT"))
                );
                SecurityContextHolder.getContext().setAuthentication(auth);
            }
        }

        filterChain.doFilter(request, response);
    }
}
