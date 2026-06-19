package org.example.auth;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import org.example.repository.UserRepository;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;
import java.util.UUID;

@Component
public class SessionAuthFilter extends OncePerRequestFilter {

    private final UserRepository userRepository;

    public SessionAuthFilter(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
            HttpServletResponse response,
            jakarta.servlet.FilterChain filterChain)
            throws jakarta.servlet.ServletException, IOException {

        HttpSession session = request.getSession(false);
        if (session != null) {
            String userIdStr = (String) session.getAttribute("userId");
            if (userIdStr != null && SecurityContextHolder.getContext().getAuthentication() == null) {
                try {
                    UUID userId = UUID.fromString(userIdStr);
                    userRepository.findById(userId).ifPresent(user -> {
                        UsernamePasswordAuthenticationToken auth = new UsernamePasswordAuthenticationToken(
                                user, null,
                                List.of(new SimpleGrantedAuthority("ROLE_USER")));
                        auth.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                        SecurityContextHolder.getContext().setAuthentication(auth);
                    });
                } catch (IllegalArgumentException ignored) {
                }
            }
        }
        filterChain.doFilter(request, response);
    }
}
