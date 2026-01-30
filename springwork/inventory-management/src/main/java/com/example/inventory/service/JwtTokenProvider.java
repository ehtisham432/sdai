package com.example.inventory.service;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.stereotype.Service;

import com.example.inventory.Role;

import javax.crypto.SecretKey;

import java.util.Collection;
import java.util.Collections;
import java.util.Date;
import java.util.Map;
import java.util.stream.Collectors;
import java.util.HashMap;
import java.util.List;

@Service
public class JwtTokenProvider {

    @Value("${jwt.secret:mySecretKeyForInventoryManagementApplicationWithMinimum256BitsLengthRequired}")
    private String jwtSecret;

    @Value("${jwt.expiration:86400000}") // 24 hours 86400000
    private long jwtExpirationMs;

    public String generateToken(Long userId, String username) {
        SecretKey key = Keys.hmacShaKeyFor(jwtSecret.getBytes());
        
        return Jwts.builder()
                .setSubject(String.valueOf(userId))
                .claim("username", username)
                .setIssuedAt(new Date())
                .setExpiration(new Date((new Date()).getTime() + jwtExpirationMs))
                .signWith(key, SignatureAlgorithm.HS256)
                .compact();
    }

    public String generateToken(Long userId, String username, List<Role> roles, Long tenantId, String tenantName) {
        SecretKey key = Keys.hmacShaKeyFor(jwtSecret.getBytes());
        
        Map<String, Object> claims = new HashMap<>();
        claims.put("username", username);
        claims.put("roleId", roles.get(0).getId());
        claims.put("roles", roles.stream().map(r->r.getName()).collect(Collectors.toList()));
        claims.put("tenantId", tenantId);
        claims.put("tenantName", tenantName);
        
        return Jwts.builder()
                .setSubject(String.valueOf(userId))
                .addClaims(claims)
                .setIssuedAt(new Date())
                .setExpiration(new Date((new Date()).getTime() + jwtExpirationMs))
                .signWith(key, SignatureAlgorithm.HS256)
                .compact();
    }

    public Long getUserIdFromToken(String token) {
        try {
            SecretKey key = Keys.hmacShaKeyFor(jwtSecret.getBytes());
            Claims claims = Jwts.parser()
                    .verifyWith(key)
                    .build()
                    .parseSignedClaims(token)
                    .getPayload();
            return Long.valueOf(claims.getSubject());
        } catch (Exception e) {
            return null;
        }
    }

    public boolean validateToken(String token) {
        try {
            SecretKey key = Keys.hmacShaKeyFor(jwtSecret.getBytes());
            Jwts.parser()
                    .verifyWith(key)
                    .build()
                    .parseSignedClaims(token);
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    public String getClaimFromToken(String token, String claimName) {
        try {
            SecretKey key = Keys.hmacShaKeyFor(jwtSecret.getBytes());
            Claims claims = Jwts.parser()
                    .verifyWith(key)
                    .build()
                    .parseSignedClaims(token)
                    .getPayload();
            Object claim = claims.get(claimName);
            return claim != null ? claim.toString() : null;
        } catch (Exception e) {
            return null;
        }
    }
 // Extract authorities (roles) from JWT
	public Collection<? extends GrantedAuthority> getAuthorities(String token) {
        Claims claims = extractAllClaims(token);

        // Assuming you stored roles in a claim called "roles"
        List<String> roles = claims.get("roles", List.class);

        if (roles == null) {
            return Collections.emptyList();
        }

        return roles.stream()
                .map(SimpleGrantedAuthority::new)
                .collect(Collectors.toList());
    }
 // Helpers
	private Claims extractAllClaims(String token) {
    	SecretKey key = Keys.hmacShaKeyFor(jwtSecret.getBytes());
        return Jwts.parser()
                .verifyWith(key)
                .build()
                .parseSignedClaims(token)
                .getPayload();
//        		Jwts.parser()
//                .setSigningKey(jwtSecret);//SECRET_KEY
//                .parseClaimsJws(token)
//                .getBody();
    }


}
