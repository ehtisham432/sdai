package com.example.inventory.service;

import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.beans.factory.annotation.Autowired;
import com.example.inventory.repository.UserRepository;
import com.example.inventory.repository.CompanyRepository;
import com.example.inventory.repository.RoleScreenRepository;
import com.example.inventory.repository.ScreenRepository;

import java.util.*;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.security.Keys;

@Service
public class DashboardService {
    @Autowired
    private UserRepository userRepository;
    @Autowired
    private CompanyRepository companyRepository;
    @Autowired
    private RoleScreenRepository roleScreenRepository;
    @Autowired
    private ScreenRepository screenRepository;

    public ResponseEntity<?> loadDashboard( Long roleId) {
        // Extract JWT token from header
//        String token = null;
//        if (authHeader != null && authHeader.startsWith("Bearer ")) {
//            token = authHeader.substring(7);
//        }
//        if (token == null) {
//            return ResponseEntity.status(401).body(Map.of("success", false, "message", "Missing or invalid token"));
//        }

        // Parse JWT and extract username (subject), companyId, roleName (roleId from query param)
//        String username = null;
//        Integer companyId = null;
//        String roleName = null;
//        // roleId is now passed as a parameter, not extracted from JWT
//        try {
//            // TODO: Replace with your actual secret key (should be externalized in config)
//            String jwtSecret = "change_this_secret_change_to_real_key";
//            byte[] keyBytes = jwtSecret.getBytes();
//            Claims claims = io.jsonwebtoken.Jwts.parserBuilder()
//                .setSigningKey(Keys.hmacShaKeyFor(keyBytes))
//                .build()
//                .parseClaimsJws(token)
//                .getBody();
//            username = claims.getSubject();
//            Object companyIdObj = claims.get("companyId");
//            Object roleNameObj = claims.get("roleName");
//            if (companyIdObj != null) companyId = Integer.valueOf(companyIdObj.toString());
//            if (roleNameObj != null) roleName = roleNameObj.toString();
//        } catch (Exception e) {
//            return ResponseEntity.status(401).body(Map.of("success", false, "message", "Invalid token"));
//        }

        // Get roleId from query param if present
        // (Spring: get from request param)
//        String roleIdParam = null;
//        try {
//            var requestAttributes = org.springframework.web.context.request.RequestContextHolder.getRequestAttributes();
//            if (requestAttributes instanceof org.springframework.web.context.request.ServletRequestAttributes servletRequestAttributes) {
//                var req = servletRequestAttributes.getRequest();
//                roleIdParam = req.getParameter("roleId");
//            }
//        } catch (Exception ignore) {}
//        if (roleIdParam != null) {
//            try { roleId = Long.valueOf(roleIdParam); } catch (Exception ignore) {}
//        }

        // Fetch user, company, role screens
//        Map<String, Object> userMap = new HashMap<>();
//        userMap.put("username", username);
//        userMap.put("roleId", roleId);
//        userMap.put("roleName", roleName);
//
//        Map<String, Object> companyMap = new HashMap<>();
//        if (companyId != null) {
//            companyRepository.findById(Long.valueOf(companyId)).ifPresent(company -> {
//                companyMap.put("id", company.getId());
//                companyMap.put("name", company.getName());
//            });
//        }

        // Get role screens for this roleId
        List<Map<String, Object>> roleScreensList = new ArrayList<>();
        if (roleId != null) {
            List<?> roleScreens = roleScreenRepository.findByRoleId(roleId);
            for (Object rsObj : roleScreens) {
                // Assuming RoleScreen has getScreen() and getScreen().getName(), getScreen().getPath(), getScreen().getDisplayType(), getScreen().getGroup()
                try {
                    var rs = (com.example.inventory.RoleScreen) rsObj;
                    var screen = rs.getScreen();
                    Map<String, Object> screenMap = new HashMap<>();
                    screenMap.put("id", screen.getId());
                    screenMap.put("name", screen.getName());
                    screenMap.put("path", screen.getPath());
                    screenMap.put("displayType", screen.getDisplayType() != null ? screen.getDisplayType().getName() : null);
                    if (screen.getGroup() != null) {
                        screenMap.put("group", Map.of("id", screen.getGroup().getId(), "name", screen.getGroup().getName()));
                    }
                    roleScreensList.add(screenMap);
                } catch (Exception ex) {
                    // skip
                }
            }
        }

        // Menus: for now, use roleScreensList for menus
        List<Map<String, Object>> menus = new ArrayList<>(roleScreensList);

        // Display type: default to D
        String displayType = "D";

        Map<String, Object> responseData = new HashMap<>();
//        responseData.put("user", userMap);
//        responseData.put("company", companyMap);
        responseData.put("roleScreens", roleScreensList);
        responseData.put("menus", menus);
        responseData.put("displayType", displayType);

        Map<String, Object> result = new HashMap<>();
        result.put("success", true);
        result.put("data", responseData);
        return ResponseEntity.ok(result);
    }
}
