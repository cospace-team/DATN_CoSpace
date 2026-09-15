package com.cospace.app.config;

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
@org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity
@lombok.extern.slf4j.Slf4j
public class SecurityConfig {

        private final SupabaseJwtAuthenticationConverter jwtAuthenticationConverter;

        public SecurityConfig(SupabaseJwtAuthenticationConverter jwtAuthenticationConverter) {
                this.jwtAuthenticationConverter = jwtAuthenticationConverter;
        }

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
                // Local Decoder (HS384)
                NimbusJwtDecoder localNimbusDecoder = NimbusJwtDecoder.withSecretKey(
                        new SecretKeySpec(jwtSecret.getBytes(StandardCharsets.UTF_8), "HmacSHA384")
                ).macAlgorithm(org.springframework.security.oauth2.jose.jws.MacAlgorithm.HS384).build();

                // A refresh token is signed with the same key and lives for 30 days, so without this
                // it would work as a bearer token on every API. Only access tokens may authenticate.
                localNimbusDecoder.setJwtValidator(new org.springframework.security.oauth2.core.DelegatingOAuth2TokenValidator<>(
                        org.springframework.security.oauth2.jwt.JwtValidators.createDefault(),
                        token -> com.cospace.app.util.JwtUtil.TOKEN_USE_REFRESH
                                        .equals(token.getClaimAsString(com.cospace.app.util.JwtUtil.CLAIM_TOKEN_USE))
                                ? org.springframework.security.oauth2.core.OAuth2TokenValidatorResult.failure(
                                        new org.springframework.security.oauth2.core.OAuth2Error("invalid_token",
                                                "Refresh token không dùng để gọi API.", null))
                                : org.springframework.security.oauth2.core.OAuth2TokenValidatorResult.success()));

                JwtDecoder localDecoder = localNimbusDecoder;

                return new JwtDecoder() {
                        private JwtDecoder supabaseDecoder;

                        private synchronized JwtDecoder getSupabaseDecoder() {
                                if (supabaseDecoder == null) {
                                        // Supabase uses ECC (P-256) now. The public keys are fetched from JWKS URL
                                        supabaseDecoder = NimbusJwtDecoder.withIssuerLocation(supabaseIssuer).build();
                                }
                                return supabaseDecoder;
                        }

                        @Override
                        public org.springframework.security.oauth2.jwt.Jwt decode(String token) throws org.springframework.security.oauth2.jwt.JwtException {
                                // Note: the raw decoded payload (which carries the user's email, role, etc.)
                                // must never be logged here, even at debug level — this decode() runs on
                                // every single authenticated request.
                                try {
                                        String[] parts = token.split("\\.");
                                        if (parts.length >= 2) {
                                                String payload = new String(java.util.Base64.getUrlDecoder().decode(parts[1]), StandardCharsets.UTF_8);
                                                if (payload.contains(supabaseIssuer)) {
                                                        try {
                                                                return getSupabaseDecoder().decode(token);
                                                        } catch (org.springframework.security.oauth2.jwt.JwtException e) {
                                                                log.debug("Supabase JWT decode failed: {}", e.getMessage());
                                                                throw e;
                                                        } catch (Exception e) {
                                                                log.warn("Unexpected error decoding Supabase JWT: {}", e.getMessage());
                                                                throw new org.springframework.security.oauth2.jwt.JwtException("Supabase token error: " + e.getMessage(), e);
                                                        }
                                                }
                                        }
                                } catch (org.springframework.security.oauth2.jwt.JwtException e) {
                                        throw e;
                                } catch (Exception e) {
                                        log.debug("Could not parse token to determine issuer, falling back to local decoder: {}", e.getMessage());
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
                                                .requestMatchers(org.springframework.http.HttpMethod.OPTIONS, "/**").permitAll()
                                                .requestMatchers(
                                                                new AntPathRequestMatcher("/momo/**"),
                                                                new AntPathRequestMatcher("/payos/**"),
                                                                new AntPathRequestMatcher("/api/health"),
                                                                new AntPathRequestMatcher("/api/payments/momo/ipn"),
                                                                new AntPathRequestMatcher("/api/payments/momo/return"),
                                                                new AntPathRequestMatcher("/api/payments/payos/ipn"),
                                                                new AntPathRequestMatcher("/api/payments/payos/webhook"),
                                                                new AntPathRequestMatcher("/api/payments/payos/notify"),
                                                                new AntPathRequestMatcher("/api/payments/payos/return"),
                                                                new AntPathRequestMatcher("/api/payments/payos/status/**"),
                                                                new AntPathRequestMatcher("/api/auth/register"),
                                                                new AntPathRequestMatcher("/api/auth/login"),
                                                                new AntPathRequestMatcher("/api/auth/refresh"),
                                                                new AntPathRequestMatcher("/api/customer/spaces/branches"),
                                                                new AntPathRequestMatcher("/api/customer/spaces/pricing-summary"),
                                                                new AntPathRequestMatcher("/h2-console/**"),
                                                                new AntPathRequestMatcher("/error"))
                                                .permitAll()
                                                .requestMatchers("/api/staff/**").hasAnyRole("STAFF", "BRANCH_ADMIN", "SUPER_ADMIN", "ADMIN", "staff", "branch_admin", "admin")
                                                .requestMatchers("/api/checkins/**").hasAnyRole("STAFF", "BRANCH_ADMIN", "SUPER_ADMIN", "ADMIN", "staff", "branch_admin", "admin")
                                                .requestMatchers("/api/bookings/branch-today", "/api/bookings/code/**").hasAnyRole("STAFF", "BRANCH_ADMIN", "SUPER_ADMIN", "ADMIN", "staff", "branch_admin", "admin")
                                                .requestMatchers("/api/branch-admin/**").hasAnyRole("BRANCH_ADMIN", "SUPER_ADMIN", "ADMIN", "branch_admin", "admin")
                                                .requestMatchers("/api/admin/**").hasAnyRole("SUPER_ADMIN", "ADMIN", "super_admin", "admin")
                                                .requestMatchers("/api/reports/**").hasAnyRole("SUPER_ADMIN", "ADMIN", "BRANCH_ADMIN", "super_admin", "admin", "branch_admin")
                                                .requestMatchers("/api/refunds/**").hasAnyRole("BRANCH_ADMIN", "SUPER_ADMIN", "ADMIN", "branch_admin", "super_admin", "admin")
                                                .anyRequest().authenticated())
                                .oauth2ResourceServer(oauth2 -> oauth2
                                                .jwt(jwt -> jwt.decoder(jwtDecoder()).jwtAuthenticationConverter(jwtAuthenticationConverter))
                                                .authenticationEntryPoint((request, response, authException) -> {
                                                        response.setStatus(401);
                                                        response.setContentType("application/json;charset=UTF-8");
                                                        response.getWriter().write("{\"error\":\"UNAUTHORIZED\",\"message\":\"Phiên đăng nhập không hợp lệ hoặc đã hết hạn.\"}");
                                                })
                                )
                                .exceptionHandling(ex -> ex
                                                .authenticationEntryPoint((request, response, authException) -> {
                                                        response.setStatus(401);
                                                        response.setContentType("application/json;charset=UTF-8");
                                                        response.getWriter().write("{\"error\":\"UNAUTHORIZED\",\"message\":\"Vui lòng đăng nhập để tiếp tục.\"}");
                                                })
                                                .accessDeniedHandler((request, response, accessDeniedException) -> {
                                                        response.setStatus(403);
                                                        response.setContentType("application/json;charset=UTF-8");
                                                        response.getWriter().write("{\"error\":\"FORBIDDEN\",\"message\":\"Bạn không có quyền thực hiện hành động này.\"}");
                                                })
                                );

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
