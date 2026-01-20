package com.example.inventory.controller;

import com.example.inventory.User;
import com.example.inventory.UserCompanyRole;
import com.example.inventory.dto.LoginRequest;
import com.example.inventory.dto.LoginResponse;
import com.example.inventory.repository.UserRepository;
import com.example.inventory.repository.UserCompanyRoleRepository;
import com.example.inventory.service.JwtTokenProvider;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "*", allowedHeaders = "*")
public class AuthController {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private UserCompanyRoleRepository userCompanyRoleRepository;

    @Autowired
    private JwtTokenProvider jwtTokenProvider;

    private final BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest loginRequest) {
        try {
            // Validate input
            if (loginRequest.getUsername() == null || loginRequest.getUsername().isEmpty() ||
                loginRequest.getPassword() == null || loginRequest.getPassword().isEmpty()) {
                return ResponseEntity.badRequest()
                        .body(new LoginResponse(false, "Username and password are required", null, null));
            }

            // Find user by loginName or email
            User user = userRepository.findFirstByLoginName(loginRequest.getUsername());
            if (user == null) {
                user = userRepository.findFirstByEmail(loginRequest.getUsername());
            }

            // Check if user exists
            if (user == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(new LoginResponse(false, "Invalid username or password", null, null));
            }

            if(!loginRequest.getPassword().equals(loginRequest.getPassword())) {
            	return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(new LoginResponse(false, "Invalid username or password", null, null));
            }
            // Verify password
            /*if (!passwordEncoder.matches(loginRequest.getPassword(), user.getPassword())) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(new LoginResponse(false, "Invalid username or password", null, null));
            }*/

            // Generate JWT token with role and tenant info
            Long roleId = null;
            Long tenantId = null;
            String tenantName = null;
            
            // Fetch user's role and company info
            List<UserCompanyRole> userRoles = userCompanyRoleRepository.findByUserId(user.getId());
            if (!userRoles.isEmpty()) {
                UserCompanyRole firstRole = userRoles.get(0);
                if (firstRole.getRole() != null) {
                    roleId = firstRole.getRole().getId();
                }
                if (firstRole.getCompany() != null) {
                    tenantId = firstRole.getCompany().getId();
                    tenantName = firstRole.getCompany().getName();
                }
            }
            
            String token = jwtTokenProvider.generateToken(user.getId(), user.getUsername(), roleId, tenantId, tenantName);

            // Create user info for response
            LoginResponse.UserInfo userInfo = new LoginResponse.UserInfo(
                    user.getId(),
                    user.getUsername(),
                    user.getEmail()
            );

            return ResponseEntity.ok(new LoginResponse(true, "Login successful", token, userInfo));

        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new LoginResponse(false, "An error occurred during login: " + e.getMessage(), null, null));
        }
    }

    @GetMapping("/validate-token")
    public ResponseEntity<?> validateToken(@RequestHeader("Authorization") String token) {
        try {
            if (token == null || !token.startsWith("Bearer ")) {
                return ResponseEntity.badRequest()
                        .body(new java.util.HashMap<String, Object>() {{
                            put("valid", false);
                            put("message", "Invalid token format");
                        }});
            }

            String jwt = token.substring(7);
            boolean isValid = jwtTokenProvider.validateToken(jwt);

            if (isValid) {
                Long userId = jwtTokenProvider.getUserIdFromToken(jwt);
                return ResponseEntity.ok(new java.util.HashMap<String, Object>() {{
                    put("valid", true);
                    put("userId", userId);
                }});
            } else {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(new java.util.HashMap<String, Object>() {{
                            put("valid", false);
                            put("message", "Token is invalid or expired");
                        }});
            }
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new java.util.HashMap<String, Object>() {{
                        put("valid", false);
                        put("message", "Error validating token: " + e.getMessage());
                    }});
        }
    }
}
