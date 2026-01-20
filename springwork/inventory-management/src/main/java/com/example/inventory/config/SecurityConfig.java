package com.example.inventory.config;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Autowired
    private JwtAuthenticationFilter jwtAuthenticationFilter;

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            .csrf().disable()
            .authorizeHttpRequests(authz -> authz
                .requestMatchers("/", "/index.html", "/login.html", "/static/**").permitAll()
                .requestMatchers("/api/login", "/api/auth/**").permitAll()
                .requestMatchers("GET", "/screens", "/screen-groups", "/display-types").permitAll()
                .requestMatchers("GET", "/api/screens", "/api/screen-groups", "/api/display-types").permitAll()
                .requestMatchers("GET", "/api/dashboard/**").permitAll()
                // Allow access to all static HTML pages
                .requestMatchers("/*.html").permitAll()
                // Protect API endpoints that modify data
                .requestMatchers("POST", "/api/**").authenticated()
                .requestMatchers("PUT", "/api/**").authenticated()
                .requestMatchers("DELETE", "/api/**").authenticated()
                .requestMatchers("POST", "/screens", "/screen-groups", "/display-types").authenticated()
                .requestMatchers("PUT", "/screens/**", "/screen-groups/**", "/display-types/**").authenticated()
                .requestMatchers("DELETE", "/screens/**", "/screen-groups/**", "/display-types/**").authenticated()
                .anyRequest().permitAll()
            )
            .formLogin()
                .loginPage("/login.html")
                .permitAll()
            .and()
            .logout()
                .permitAll();
        
        // Add JWT filter before UsernamePasswordAuthenticationFilter
        http.addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public WebMvcConfigurer corsConfigurer() {
        return new WebMvcConfigurer() {
            @Override
            public void addCorsMappings(CorsRegistry registry) {
                registry.addMapping("/api/**")
                        .allowedOrigins("*")
                        .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS")
                        .allowedHeaders("*")
                        .allowCredentials(false)
                        .maxAge(3600);
            }
        };
    }
}
