package org.example.security;

import org.example.auth.SessionAuthFilter;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.security.web.csrf.CookieCsrfTokenRepository;
import org.springframework.security.web.csrf.CsrfTokenRequestAttributeHandler;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    private final SessionAuthFilter sessionAuthFilter;
    private final RateLimitFilter rateLimitFilter;

    @Value("${cors.allowed.origins:http://localhost:5173}")
    private String allowedOrigins;

    public SecurityConfig(SessionAuthFilter sessionAuthFilter, RateLimitFilter rateLimitFilter) {
        this.sessionAuthFilter = sessionAuthFilter;
        this.rateLimitFilter = rateLimitFilter;
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            // Disable CSRF for local development simulator since we use SameSite Lax cookies
            .csrf(csrf -> csrf.disable())
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/oauth/**").permitAll()
                .requestMatchers("/ws/**").permitAll()           // WebSocket handshake
                .requestMatchers(HttpMethod.GET, "/actuator/health").permitAll()
                .anyRequest().authenticated()
            )
            // Keep sessions (not STATELESS) for OAuth
            .sessionManagement(session -> session
                .sessionCreationPolicy(SessionCreationPolicy.IF_REQUIRED)
                .maximumSessions(5)
            )
            // No form login, no HTTP Basic
            .formLogin(form -> form.disable())
            .httpBasic(basic -> basic.disable())
            // Rate Limiting
            .addFilterBefore(rateLimitFilter, UsernamePasswordAuthenticationFilter.class)
            // Insert our session filter before the default UsernamePasswordAuthenticationFilter
            .addFilterBefore(sessionAuthFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public org.springframework.boot.web.servlet.FilterRegistrationBean<SessionAuthFilter> sessionAuthFilterRegistration(SessionAuthFilter filter) {
        org.springframework.boot.web.servlet.FilterRegistrationBean<SessionAuthFilter> registration = new org.springframework.boot.web.servlet.FilterRegistrationBean<>(filter);
        registration.setEnabled(false);
        return registration;
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOriginPatterns(List.of(allowedOrigins.split(",")));
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"));
        config.setAllowedHeaders(List.of("Authorization", "Content-Type", "X-XSRF-TOKEN"));
        config.setExposedHeaders(List.of("Set-Cookie"));
        config.setAllowCredentials(true); // Required for session cookies
        config.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }
}
