package org.example.auth;

import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import org.example.config.ZohoApiConfig;
import org.example.entity.UserEntity;
import org.example.repository.UserRepository;
import org.example.zoho.AppConnectionService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

/**
 * Zoho OAuth 2.0 Authorization Code Flow controller.
 *
 * Flow:
 * 1. Frontend calls GET /oauth/login?region=in
 * 2. Backend builds the OAuth URL with a CSRF state token and redirects
 * 3. Zoho shows login + consent screen to user
 * 4. Zoho redirects back to GET /oauth/callback?code=...&state=...
 * 5. Backend validates state, exchanges code for tokens, saves user
 * 6. Redirect to /select-app — user picks which IoT sandbox application to use
 *    (or goes straight to / if they already have an active connection)
 *
 * No domain is entered at login time. The application domain is managed
 * separately in the /select-app page after authentication.
 */
@RestController
@RequestMapping("/oauth")
public class ZohoOAuthController {

    private static final Logger log = LoggerFactory.getLogger(ZohoOAuthController.class);
    private static final String SESSION_USER_ID  = "userId";
    private static final String SESSION_REGION   = "region";
    private static final String SESSION_CSRF     = "oauth_state_csrf";

    private final ZohoApiConfig zohoApiConfig;
    private final ZohoOAuthService oauthService;
    private final UserRepository userRepository;
    private final AppConnectionService appConnectionService;

    public ZohoOAuthController(ZohoApiConfig zohoApiConfig,
            ZohoOAuthService oauthService,
            UserRepository userRepository,
            AppConnectionService appConnectionService) {
        this.zohoApiConfig = zohoApiConfig;
        this.oauthService = oauthService;
        this.userRepository = userRepository;
        this.appConnectionService = appConnectionService;
    }

    /**
     * Step 1: Initiate OAuth flow.
     * Just needs the region — no domain entry required.
     */
    @GetMapping("/login")
    public ResponseEntity<Map<String, String>> initiateLogin(
            @RequestParam(defaultValue = "in") String region,
            HttpServletRequest request,
            HttpSession session) {

        session.invalidate();

        String csrfToken = UUID.randomUUID().toString();
        HttpSession freshSession = request.getSession(true);
        freshSession.setAttribute(SESSION_CSRF, csrfToken);
        freshSession.setAttribute(SESSION_REGION, region);

        String authUrl = zohoApiConfig.getAuthorizationUrl(region, csrfToken);
        log.info("Initiating OAuth for region={}", region);

        return ResponseEntity.ok(Map.of("authorizationUrl", authUrl));
    }

    /**
     * Step 2: Handle Zoho callback after user authorization.
     */
    @GetMapping("/callback")
    public void handleCallback(
            @RequestParam String code,
            @RequestParam(required = false) String state,
            @RequestParam(required = false) String error,
            HttpSession session,
            HttpServletResponse response) throws Exception {

        if (error != null) {
            log.warn("OAuth callback error: {}", error);
            response.sendRedirect("/login?error=" + error);
            return;
        }

        // CSRF validation
        String savedCsrf = (String) session.getAttribute(SESSION_CSRF);
        if (savedCsrf != null && state != null && !savedCsrf.equals(state)) {
            log.warn("OAuth CSRF state mismatch");
            response.sendRedirect("/login?error=state_mismatch");
            return;
        }

        String region = (String) session.getAttribute(SESSION_REGION);
        if (region == null) region = zohoApiConfig.getDefaultRegion();

        try {
            UserEntity user = oauthService.exchangeCodeForUser(code, region);
            session.setAttribute(SESSION_USER_ID, user.getId().toString());
            session.setAttribute(SESSION_REGION, region);
            session.removeAttribute(SESSION_CSRF);

            log.info("User {} authenticated via Zoho OAuth (region={})", user.getZohoUserId(), region);

            try {
                appConnectionService.discoverAndSaveConnections(user);
            } catch (Exception discoveryError) {
                log.warn("Zoho IoT application discovery failed after login for user {}: {}",
                        user.getZohoUserId(), discoveryError.getMessage());
            }
            response.sendRedirect(zohoApiConfig.hasValidIotRuntimeDomain(user) ? "/" : "/select-app");
        } catch (Exception e) {
            log.error("OAuth token exchange failed: {}", e.getMessage(), e);
            response.sendRedirect("/login?error=token_exchange_failed");
        }
    }

    /**
     * Logout: revoke token, invalidate session.
     */
    @PostMapping("/logout")
    public ResponseEntity<Void> logout(HttpSession session) {
        String userIdStr = (String) session.getAttribute(SESSION_USER_ID);
        if (userIdStr != null) {
            userRepository.findById(UUID.fromString(userIdStr))
                    .ifPresent(oauthService::revokeToken);
        }
        session.invalidate();
        return ResponseEntity.noContent().build();
    }

    /**
     * Returns the currently authenticated user's profile.
     */
    @GetMapping("/me")
    public ResponseEntity<?> getCurrentUser(HttpSession session) {
        String userIdStr = (String) session.getAttribute(SESSION_USER_ID);
        if (userIdStr == null) {
            return ResponseEntity.status(401).body(Map.of("error", "Not authenticated"));
        }
        return userRepository.findById(UUID.fromString(userIdStr))
                .map(u -> ResponseEntity.ok(Map.of(
                        "id",          u.getId().toString(),
                        "email",       u.getEmail() != null ? u.getEmail() : "",
                        "displayName", u.getDisplayName() != null ? u.getDisplayName() : u.getEmail(),
                        "region",      u.getRegion(),
                        "appDomain",   u.getAppDomain() != null ? u.getAppDomain() : "",
                        "zohoUserId",  u.getZohoUserId())))
                .orElseGet(() -> ResponseEntity.status(401).build());
    }
}
