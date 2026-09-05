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
                JwtDecoder localDecoder = NimbusJwtDecoder.withSecretKey(
                        new SecretKeySpec(jwtSecret.getBytes(StandardCharsets.UTF_8), "HmacSHA384")
                ).macAlgorithm(org.springframework.security.oauth2.jose.jws.MacAlgorithm.HS384).build();

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
                                try {
                                        String[] parts = token.split("\\.");
                                        if (parts.length >= 2) {
                                                String payload = new String(java.util.Base64.getUrlDecoder().decode(parts[1]), StandardCharsets.UTF_8);
                                                System.err.println("[JWT Debug] Payload: " + payload);
                                                if (payload.contains(supabaseIssuer)) {
                                                        try {
                                                                System.err.println("[JWT Debug] Routing to Supabase Decoder...");
                                                                return getSupabaseDecoder().decode(token);
                                                        } catch (org.springframework.security.oauth2.jwt.JwtException e) {
                                                                System.err.println("[JWT Debug] Supabase JwtException: " + e.getMessage());
                                                                throw e;
                                                        } catch (Exception e) {
                                                                System.err.println("[JWT Debug] Supabase Decoder Error: " + e.getMessage());
                                                                e.printStackTrace();
                                                                throw new org.springframework.security.oauth2.jwt.JwtException("Supabase token error: " + e.getMessage(), e);
                                                        }
                                                } else {
                                                        System.err.println("[JWT Debug] Issuer not matched! Expected: " + supabaseIssuer);
                                                }
                                        }
                                } catch (org.springframework.security.oauth2.jwt.JwtException e) {
                                        throw e;
                                } catch (Exception e) {
                                        System.err.println("[JWT Debug] Unknown Parsing Error: " + e.getMessage());
                                }
                                System.err.println("[JWT Debug] Falling back to Local Decoder...");
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
                                                                new AntPathRequestMatcher("/api/health"),
                                                                new AntPathRequestMatcher("/api/payments/momo/ipn"),
                                                                new AntPathRequestMatcher("/api/payments/momo/return"),
                                                                new AntPathRequestMatcher("/api/auth/register"),
                                                                new AntPathRequestMatcher("/api/auth/login"),
                                                                new AntPathRequestMatcher("/api/auth/dev-login"),
                                                                new AntPathRequestMatcher("/api/auth/refresh"),
                                                                new AntPathRequestMatcher("/h2-console/**"),
                                                                new AntPathRequestMatcher("/error"))
                                                .permitAll()
                                                .requestMatchers("/api/staff/**").hasAnyRole("STAFF", "BRANCH_ADMIN", "SUPER_ADMIN", "ADMIN", "staff", "branch_admin", "admin")
                                                .requestMatchers("/api/branch-admin/**").hasAnyRole("BRANCH_ADMIN", "SUPER_ADMIN", "ADMIN", "branch_admin", "admin")
                                                .requestMatchers("/api/admin/**").hasAnyRole("SUPER_ADMIN", "ADMIN", "super_admin", "admin")
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
