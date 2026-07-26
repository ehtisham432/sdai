package com.example.inventory.config;

import com.example.inventory.service.JwtTokenProvider;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.ArrayList;

@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    @Autowired
    private JwtTokenProvider jwtTokenProvider;

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        try {
            String authHeader = request.getHeader("Authorization");
            String requestPath = request.getRequestURI();
            
            String jwtl = null;
            if (request.getCookies() != null) {
                for (Cookie cookie : request.getCookies()) {
                    if ("jwt".equals(cookie.getName())) {
                        jwtl = cookie.getValue();
                    }
                }
            }

            if (jwtl != null) {
                String username = jwtTokenProvider.getClaimFromToken(jwtl, "username");//.extractUsername(jwt);
                if (username != null && SecurityContextHolder.getContext().getAuthentication() == null) {
                    if (jwtTokenProvider.validateToken(jwtl)) {
                        UsernamePasswordAuthenticationToken authToken =
                            new UsernamePasswordAuthenticationToken(
                                username, null, jwtTokenProvider.getAuthorities(jwtl));//jwtService.getAuthorities(jwt)
                        SecurityContextHolder.getContext().setAuthentication(authToken);
                    }
                }
            }

            
            // Log for debugging
            System.out.println("[JWT Filter] Request: " + request.getMethod() + " " + requestPath);
            System.out.println("[JWT Filter] Authorization header: " + (authHeader != null ? authHeader.substring(0, Math.min(20, authHeader.length())) + "..." : "null"));
            
            if (authHeader != null && authHeader.startsWith("Bearer ")) {
                String jwt = authHeader.substring(7);
                
                // Validate token
                if (jwtTokenProvider.validateToken(jwt)) {
                    Long userId = jwtTokenProvider.getUserIdFromToken(jwt);
                    String username = jwtTokenProvider.getClaimFromToken(jwt, "username");
                    
                    System.out.println("[JWT Filter] Token valid for user: " + username + " (ID: " + userId + ")");
                    
                    // Create authentication token
                    UsernamePasswordAuthenticationToken authentication = 
                        new UsernamePasswordAuthenticationToken(username, null, new ArrayList<>());
                    authentication.setDetails(userId);
                    
                    SecurityContextHolder.getContext().setAuthentication(authentication);
                    System.out.println("[JWT Filter] Authentication set for user: " + username);
                } else {
                    System.out.println("[JWT Filter] Token validation failed");
                }
            } else {
                System.out.println("[JWT Filter] No Bearer token found in Authorization header");
            }
        } catch (Exception e) {
            logger.error("Cannot set user authentication", e);
            System.out.println("[JWT Filter] Exception: " + e.getMessage());
            e.printStackTrace();
        }
        
        filterChain.doFilter(request, response);
    }
}
