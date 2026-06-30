package com.example.momosandbox.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.util.matcher.AntPathRequestMatcher;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;

import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.List;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

        @Value("${app.jwt.secret:defaultSecretKeyWhichIsVeryLongAndSecureForLocalAuth1234!@#}")
        private String jwtSecret;

        @Value("${spring.security.oauth2.resourceserver.jwt.issuer-uri:https://ozaiknomajljfqiepels.supabase.co/auth/v1}")
        private String supabaseIssuer;

        @Bean
        public PasswordEncoder passwordEncoder() {
                return new BCryptPasswordEncoder();
        }

        @Bean
        public JwtDecoder jwtDecoder() {
                JwtDecoder localDecoder = NimbusJwtDecoder.withSecretKey(
                        new SecretKeySpec(jwtSecret.getBytes(StandardCharsets.UTF_8), "HmacSHA384")
                ).macAlgorithm(org.springframework.security.oauth2.jose.jws.MacAlgorithm.HS384).build();

                return new JwtDecoder() {
                        private JwtDecoder supabaseDecoder;

                        private synchronized JwtDecoder getSupabaseDecoder() {
                                if (supabaseDecoder == null) {
                                        supabaseDecoder = NimbusJwtDecoder.withIssuerLocation(supabaseIssuer).build();
                                }
                                return supabaseDecoder;
                        }

                        @Override
                        public org.springframework.security.oauth2.jwt.Jwt decode(String token) throws org.springframework.security.oauth2.jwt.JwtException {
                                try {
                                        String[] parts = token.split("\\.");
                                        if (parts.length >= 2) {
                                                String payload = new String(java.util.Base64.getUrlDecoder().decode(parts[1]), StandardCharsets.UTF_8);
                                                if (payload.contains("\"iss\":\"" + supabaseIssuer + "\"") 
                                                        || payload.contains("\"iss\": \"" + supabaseIssuer + "\"")) {
                                                        return getSupabaseDecoder().decode(token);
                                                }
                                        }
                                } catch (Exception e) {
                                        // fallback to localDecoder
                                }
                                return localDecoder.decode(token);
                        }
                };
        }

        @Bean
        SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
                http
                                .csrf(AbstractHttpConfigurer::disable)
                                .cors(Customizer.withDefaults())
                                .authorizeHttpRequests(auth -> auth
                                                .requestMatchers(
                                                                new AntPathRequestMatcher("/momo/**"),
                                                                new AntPathRequestMatcher("/api/health"),
                                                                new AntPathRequestMatcher("/api/payments/momo/ipn"),
                                                                new AntPathRequestMatcher("/api/payments/momo/return"),
                                                                new AntPathRequestMatcher("/api/auth/register"),
                                                                new AntPathRequestMatcher("/api/auth/login"),
                                                                new AntPathRequestMatcher("/api/auth/refresh"),
                                                                new AntPathRequestMatcher("/h2-console/**"),
                                                                new AntPathRequestMatcher("/error"))
                                                .permitAll()
                                                .anyRequest().authenticated())
                                .oauth2ResourceServer(oauth2 -> oauth2.jwt(Customizer.withDefaults()));

                return http.build();
        }

        @Bean
        CorsConfigurationSource corsConfigurationSource(
                        @Value("${app.cors.allowed-origins:http://localhost:5173}") String allowedOriginsRaw) {
                CorsConfiguration configuration = new CorsConfiguration();
                List<String> allowedOrigins = Arrays.stream(allowedOriginsRaw.split(","))
                                .map(String::trim)
                                .filter(origin -> !origin.isEmpty())
                                .toList();

                configuration.setAllowedOrigins(
                                allowedOrigins.isEmpty() ? List.of("http://localhost:5173") : allowedOrigins);
                configuration.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
                configuration.setAllowedHeaders(List.of("*"));
                configuration.setExposedHeaders(List.of("Authorization", "Content-Type"));
                configuration.setAllowCredentials(true);

                UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
                source.registerCorsConfiguration("/**", configuration);
                return source;
        }
}
