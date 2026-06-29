package org.example.auth;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.example.config.ZohoApiConfig;
import org.example.entity.UserEntity;
import org.example.repository.UserRepository;
import org.example.security.EncryptionService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestTemplate;

import java.time.Instant;

/**
 * Handles all Zoho OAuth 2.0 token lifecycle operations:
 * - Authorization code → token exchange
 * - Silent token refresh
 * - Token revocation (logout)
 * - User profile retrieval
 */
@Service
public class ZohoOAuthService {

    private static final Logger log = LoggerFactory.getLogger(ZohoOAuthService.class);

    private final ZohoApiConfig zohoApiConfig;
    private final UserRepository userRepository;
    private final EncryptionService encryptionService;
    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;

    public ZohoOAuthService(ZohoApiConfig zohoApiConfig,
            UserRepository userRepository,
            EncryptionService encryptionService) {
        this.zohoApiConfig = zohoApiConfig;
        this.userRepository = userRepository;
        this.encryptionService = encryptionService;
        this.restTemplate = new RestTemplate();
        this.objectMapper = new ObjectMapper();
    }

    // ─── Token Exchange ───────────────────────────────────────────────────────

    /**
     * Exchange an authorization code for access + refresh tokens.
     * Fetches the user's Zoho profile, upserts the user in the DB, and returns
     * them.
     */
    @Transactional
    public UserEntity exchangeCodeForUser(String code, String region) throws Exception {
        String tokenUrl = zohoApiConfig.getAccountsBaseUrl(region) + "/oauth/v2/token";

        MultiValueMap<String, String> params = new LinkedMultiValueMap<>();
        params.add("grant_type", "authorization_code");
        params.add("client_id", zohoApiConfig.getClientId());
        params.add("client_secret", zohoApiConfig.getClientSecret());
        params.add("redirect_uri", zohoApiConfig.getRedirectUri());
        params.add("code", code);

        JsonNode tokenResponse = postForm(tokenUrl, params);

        String accessToken = tokenResponse.get("access_token").asText();
        String refreshToken = tokenResponse.has("refresh_token")
                ? tokenResponse.get("refresh_token").asText()
                : null;
        long expiresIn = tokenResponse.has("expires_in")
                ? tokenResponse.get("expires_in").asLong()
                : 3600L;

        if (tokenResponse.has("api_domain")) {
            log.info("Zoho OAuth api_domain: {}", tokenResponse.get("api_domain").asText());
        }

        // Fetch Zoho user profile
        JsonNode profile = fetchUserProfile(region, accessToken);
        String zohoUserId = profile.get("ZUID").asText();
        String email = profile.has("Email") ? profile.get("Email").asText() : "";
        String displayName = profile.has("Display_Name") ? profile.get("Display_Name").asText() : email;

        // Upsert user
        UserEntity user = userRepository.findByZohoUserId(zohoUserId)
                .orElseGet(UserEntity::new);

        user.setZohoUserId(zohoUserId);
        user.setEmail(email);
        user.setDisplayName(displayName);
        user.setRegion(region);

        user.setAccessToken(encryptionService.encrypt(accessToken));
        if (refreshToken != null) {
            user.setRefreshToken(encryptionService.encrypt(refreshToken));
        }
        user.setTokenExpiresAt(Instant.now().plusSeconds(expiresIn - 60)); // 60s buffer

        return userRepository.save(user);
    }

    // ─── Token Refresh ────────────────────────────────────────────────────────

    /**
     * Silently refresh the access token using the stored refresh token.
     * Returns the decrypted new access token.
     */
    @Transactional
    public String refreshAccessToken(UserEntity user) throws Exception {
        String refreshToken = encryptionService.decrypt(user.getRefreshToken());
        if (refreshToken == null) {
            throw new IllegalStateException("No refresh token available for user: " + user.getId());
        }

        String tokenUrl = zohoApiConfig.getAccountsBaseUrl(user.getRegion()) + "/oauth/v2/token";

        MultiValueMap<String, String> params = new LinkedMultiValueMap<>();
        params.add("grant_type", "refresh_token");
        params.add("client_id", zohoApiConfig.getClientId());
        params.add("client_secret", zohoApiConfig.getClientSecret());
        params.add("refresh_token", refreshToken);

        JsonNode response = postForm(tokenUrl, params);

        String newAccessToken = response.get("access_token").asText();
        long expiresIn = response.has("expires_in") ? response.get("expires_in").asLong() : 3600L;

        // NOTE: api_domain from OAuth is the generic Zoho API domain.
        // Do NOT override appDomain here — it must stay as set by AppConnectionService.

        user.setAccessToken(encryptionService.encrypt(newAccessToken));
        user.setTokenExpiresAt(Instant.now().plusSeconds(expiresIn - 60));
        userRepository.save(user);

        log.info("Access token refreshed for user {}", user.getZohoUserId());
        return newAccessToken;
    }

    // ─── Scope Enhancement ─────────────────────────────────────────────────────

    /**
     * Uses Zoho's Scope Enhancement flow (OAuth docs, lines 821-940) to append
     * additional scopes to an existing refresh token WITHOUT requiring the user to
     * log out. Returns the redirect URL that the frontend should open in a popup/tab.
     *
     * Flow:
     *  1. POST /oauth/v2/token/scopeenhance  →  get a short-lived enhancement token
     *  2. GET  /oauth/v2/token/addextrascope →  user approves new scopes in browser
     *  3. After approval, the existing refresh token gets the new scopes appended.
     */
    public String buildScopeEnhanceUrl(UserEntity user, String additionalScopes) throws Exception {
        String refreshToken = encryptionService.decrypt(user.getRefreshToken());
        if (refreshToken == null) {
            throw new IllegalStateException("No refresh token available for user: " + user.getId());
        }

        // Step 1: get the scope enhancement token
        String accountsBase = zohoApiConfig.getAccountsBaseUrl(user.getRegion());
        String scopeEnhanceUrl = accountsBase + "/oauth/v2/token/scopeenhance";

        MultiValueMap<String, String> params = new LinkedMultiValueMap<>();
        params.add("grant_type", "update_scopes_token");
        params.add("client_id", zohoApiConfig.getClientId());
        params.add("client_secret", zohoApiConfig.getClientSecret());
        params.add("refresh_token", refreshToken);

        JsonNode response = postForm(scopeEnhanceUrl, params);
        String enhanceToken = response.has("access_token") ? response.get("access_token").asText() : null;
        if (enhanceToken == null) {
            throw new RuntimeException("Failed to get scope enhancement token: " + response);
        }

        // Step 2: build the URL that the user will click to approve new scopes
        return accountsBase
                + "/oauth/v2/token/addextrascope"
                + "?response_type=update_scopes"
                + "&client_id=" + zohoApiConfig.getClientId()
                + "&redirect_uri=" + zohoApiConfig.getRedirectUri()
                + "&scope=" + additionalScopes
                + "&enhance_token=" + enhanceToken
                + "&logout=false";
    }

    // ─── Token Revocation ─────────────────────────────────────────────────────


    @Transactional
    public void revokeToken(UserEntity user) {
        try {
            String token = encryptionService.decrypt(user.getRefreshToken());
            if (token != null) {
                String revokeUrl = zohoApiConfig.getAccountsBaseUrl(user.getRegion())
                        + "/oauth/v2/token/revoke?token=" + token;
                restTemplate.postForEntity(revokeUrl, null, String.class);
            }
        } catch (Exception e) {
            log.warn("Token revocation failed for user {}: {}", user.getZohoUserId(), e.getMessage());
        } finally {
            user.setAccessToken(null);
            user.setRefreshToken(null);
            user.setTokenExpiresAt(null);
            userRepository.save(user);
        }
    }

    // ─── Active Token Accessor ────────────────────────────────────────────────

    /**
     * Returns a valid (possibly refreshed) decrypted access token for the user.
     */
    public String getValidAccessToken(UserEntity user) throws Exception {
        if (user.getTokenExpiresAt() != null && Instant.now().isBefore(user.getTokenExpiresAt())) {
            return encryptionService.decrypt(user.getAccessToken());
        }
        // Token expired — refresh
        return refreshAccessToken(user);
    }

    // ─── Private Helpers ─────────────────────────────────────────────────────

    private JsonNode fetchUserProfile(String region, String accessToken) throws Exception {
        String profileUrl = zohoApiConfig.getAccountsBaseUrl(region) + "/oauth/user/info";
        HttpHeaders headers = new HttpHeaders();
        headers.set("Authorization", "Zoho-oauthtoken " + accessToken);
        ResponseEntity<String> response = restTemplate.exchange(
                profileUrl, HttpMethod.GET, new HttpEntity<>(headers), String.class);
        return objectMapper.readTree(response.getBody());
    }

    private JsonNode postForm(String url, MultiValueMap<String, String> params) throws Exception {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);
        ResponseEntity<String> response = restTemplate.exchange(
                url, HttpMethod.POST,
                new HttpEntity<>(params, headers), String.class);
        JsonNode node = objectMapper.readTree(response.getBody());
        if (node.has("error")) {
            throw new RuntimeException("Zoho OAuth error: " + node.get("error").asText());
        }
        return node;
    }
}
