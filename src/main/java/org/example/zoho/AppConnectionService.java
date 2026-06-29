package org.example.zoho;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.example.auth.ZohoOAuthService;
import org.example.entity.AppConnectionEntity;
import org.example.entity.UserEntity;
import org.example.config.ZohoApiConfig;
import org.example.repository.AppConnectionRepository;
import org.example.repository.UserRepository;
import org.springframework.http.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.client.HttpStatusCodeException;

import java.util.ArrayList;
import java.util.Iterator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

/**
 * Manages saved Zoho IoT Application connections for a user.
 *
 * A Zoho Developer Account (Portal) can have multiple Sandbox applications.
 * Each Sandbox has a unique domain (e.g. https://app19310rjfay.zohoiot.in).
 * All IoT API calls (models, devices, datapoints) must target the specific
 * application domain, not the generic portal URL.
 *
 * This service handles saving, switching, and removing app connections,
 * and keeps the user's active appDomain in sync on the UserEntity.
 */
@Service
public class AppConnectionService {

    private static final Logger log = LoggerFactory.getLogger(AppConnectionService.class);

    private final AppConnectionRepository appConnectionRepository;
    private final UserRepository userRepository;
    private final ZohoApiConfig zohoApiConfig;
    private final ZohoOAuthService oauthService;
    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;

    public AppConnectionService(AppConnectionRepository appConnectionRepository,
                                UserRepository userRepository,
                                ZohoApiConfig zohoApiConfig,
                                ZohoOAuthService oauthService) {
        this.appConnectionRepository = appConnectionRepository;
        this.userRepository = userRepository;
        this.zohoApiConfig = zohoApiConfig;
        this.oauthService = oauthService;
        this.restTemplate = new RestTemplate();
        this.objectMapper = new ObjectMapper();
    }

    /** Returns all saved app connections for the user, newest first. */
    public List<AppConnectionEntity> listConnections(UserEntity user) {
        return appConnectionRepository.findByUserOrderByCreatedAtDesc(user)
                .stream()
                .filter(conn -> zohoApiConfig.isAllowedIotRuntimeDomain(conn.getAppDomain()))
                .toList();
    }

    /**
     * Saves a new app connection (or updates the name if domain already exists).
     * If it is the first connection, it is automatically activated.
     */
    @Transactional
    public AppConnectionEntity addConnection(UserEntity user, String appDomain, String appName) {
        return addValidatedConnection(user, appDomain, appName);
    }

    @Transactional
    public AppConnectionEntity addValidatedConnection(UserEntity user, String appDomain, String appName) {
        if (appDomain == null || appDomain.isBlank()) {
            throw new IllegalArgumentException("Zoho IoT sandbox domain is required");
        }
        String domain = zohoApiConfig.normalizeBaseUrl(appDomain);
        if (!zohoApiConfig.isIotApplicationDomain(domain)) {
            throw new IllegalArgumentException("Enter a valid Zoho IoT sandbox domain, for example https://app1234xxxx.zohoiot.in");
        }

        try {
            String accessToken = oauthService.getValidAccessToken(user);
            HttpHeaders headers = new HttpHeaders();
            headers.set("Authorization", "Zoho-oauthtoken " + accessToken);
            headers.set("Accept", "application/json");
            validateApplicationAccess(user, headers, domain);
        } catch (IllegalArgumentException e) {
            throw e;
        } catch (Exception e) {
            throw new IllegalArgumentException("Could not validate this Zoho IoT sandbox with your account: " + e.getMessage());
        }

        return saveConnection(user, domain, appName, true);
    }

    @Transactional
    public List<AppConnectionEntity> discoverAndSaveConnections(UserEntity user) throws Exception {
        String accessToken = oauthService.getValidAccessToken(user);
        String baseUrl = zohoApiConfig.getIotBaseUrl(user.getRegion());
        HttpHeaders headers = new HttpHeaders();
        headers.set("Authorization", "Zoho-oauthtoken " + accessToken);
        headers.set("Accept", "application/json");

        LinkedHashMap<String, String> discovered = new LinkedHashMap<>();
        List<String> discoveryErrors = new ArrayList<>();
        List<String> discoverySummaries = new ArrayList<>();
        String selectedDomain = null;
        for (String path : discoveryPaths()) {
            try {
                ResponseEntity<String> response = restTemplate.exchange(
                        baseUrl + path,
                        HttpMethod.GET,
                        new HttpEntity<>(headers),
                        String.class);
                List<String> before = new ArrayList<>(discovered.keySet());
                JsonNode body = objectMapper.readTree(response.getBody());
                discoverySummaries.add(path + " -> " + summarizeDiscoveryBody(body));
                collectApplications(user, body, discovered);
                if (selectedDomain == null && (path.endsWith("/application") || path.endsWith("/settings/application"))) {
                    selectedDomain = discovered.keySet()
                            .stream()
                            .filter(domain -> !before.contains(domain))
                            .findFirst()
                            .orElse(null);
                }
            } catch (Exception e) {
                discoveryErrors.add(path + ": " + e.getMessage());
                log.debug("Zoho application discovery endpoint {} did not return usable data: {}", path, e.getMessage());
            }
        }

        if (!discoverySummaries.isEmpty()) {
            log.info("Zoho IoT discovery summaries for user {}: {}", user.getZohoUserId(), String.join(" | ", discoverySummaries));
        }

        validateConfiguredApplications(user, headers, discovered, discoverySummaries);

        if (discovered.isEmpty() && !discoveryErrors.isEmpty()) {
            String message = "Zoho did not expose any IoT sandbox application domain for this account. "
                    + "Please confirm the selected Zoho account has Zoho IoT sandbox access and that deployment-configured sandbox domains are set.";
            if (!discoverySummaries.isEmpty()) {
                message += " Discovery summary: " + String.join(" | ", discoverySummaries);
            }
            log.warn("{} User: {}", message, user.getZohoUserId());
            log.debug("Zoho IoT discovery errors for user {}: {}", user.getZohoUserId(), String.join(" | ", discoveryErrors));
            throw new IllegalStateException(message);
        }

        appConnectionRepository.deleteByUser(user);
        user.setAppDomain(null);
        userRepository.save(user);

        List<AppConnectionEntity> saved = new ArrayList<>();
        for (Map.Entry<String, String> app : discovered.entrySet()) {
            saved.add(saveConnection(user, app.getKey(), app.getValue(), false));
        }

        if (selectedDomain != null) {
            appConnectionRepository.findByUserAndAppDomain(user, selectedDomain)
                    .ifPresent(conn -> activateConnection(user, conn.getId()));
        } else if (saved.size() == 1) {
            activateConnection(user, saved.get(0).getId());
        } else {
            clearActiveSelection(user);
        }

        log.info("Discovered {} Zoho IoT applications for user {}", saved.size(), user.getZohoUserId());
        return listConnections(user);
    }

    private void validateConfiguredApplications(UserEntity user,
                                                HttpHeaders headers,
                                                Map<String, String> discovered,
                                                List<String> discoverySummaries) {
        Map<String, String> configured = zohoApiConfig.getConfiguredIotApplications(user.getRegion());
        if (configured.isEmpty()) {
            discoverySummaries.add("configured applications -> none");
            return;
        }

        int accepted = 0;
        for (Map.Entry<String, String> app : configured.entrySet()) {
            String domain = app.getKey();
            try {
                validateApplicationAccess(user, headers, domain);
                discovered.putIfAbsent(domain, app.getValue());
                accepted++;
            } catch (HttpStatusCodeException e) {
                log.info("Configured Zoho IoT application {} was not accessible for user {}: {}",
                        domain, user.getZohoUserId(), e.getStatusCode());
            } catch (Exception e) {
                log.info("Configured Zoho IoT application {} could not be validated for user {}: {}",
                        domain, user.getZohoUserId(), e.getMessage());
            }
        }
        discoverySummaries.add("configured applications -> " + accepted + " of " + configured.size() + " accessible");
    }

    private void validateApplicationAccess(UserEntity user, HttpHeaders headers, String domain) {
        String validationUrl = domain + "/iot/v1/settings/models?module=devices&view_mode=list&check_permission_view=true";
        try {
            ResponseEntity<String> response = restTemplate.exchange(
                    validationUrl,
                    HttpMethod.GET,
                    new HttpEntity<>(headers),
                    String.class);
            if (!response.getStatusCode().is2xxSuccessful()) {
                throw new IllegalArgumentException("Zoho rejected this sandbox for the signed-in account");
            }
        } catch (HttpStatusCodeException e) {
            if (e.getStatusCode().value() == 401 || e.getStatusCode().value() == 403) {
                throw new IllegalArgumentException("Your Zoho account does not have access to this sandbox");
            }
            throw e;
        }
        log.info("Validated Zoho IoT application {} for user {}", domain, user.getZohoUserId());
    }

    private List<String> discoveryPaths() {
        return List.of(
                "/iot/v1/portal",
                "/iot/v1/portals",
                "/iot/v2/portals",
                "/iot/v1/org",
                "/iot/v1/orgs",
                "/iot/v1/users/me",
                "/iot/v1/user",
                "/iot/v1/profile",
                "/iot/v1/settings/portal",
                "/iot/v1/settings/portals",
                "/iot/v1/settings/application",
                "/iot/v1/application",
                "/iot/v1/applications",
                "/iot/v1/settings/applications");
    }

    private AppConnectionEntity saveConnection(UserEntity user, String appDomain, String appName, boolean activateIfFirst) {
        String domain = zohoApiConfig.normalizeBaseUrl(appDomain);
        if (!isValidApplicationDomain(domain)) {
            throw new IllegalArgumentException("Zoho did not return a valid IoT application domain for this account");
        }

        AppConnectionEntity conn = appConnectionRepository
                .findByUserAndAppDomain(user, domain)
                .orElseGet(() -> {
                    AppConnectionEntity c = new AppConnectionEntity();
                    c.setUser(user);
                    c.setAppDomain(domain);
                    return c;
                });

        conn.setAppName(appName != null && !appName.isBlank() ? appName.trim() : extractNameFromDomain(domain));
        appConnectionRepository.save(conn);

        // If user has no active connection yet, activate this one
        boolean hasActive = appConnectionRepository.findByUserAndActiveTrue(user).isPresent();
        if (activateIfFirst && !hasActive) {
            activateConnection(user, conn.getId());
        }

        log.info("App connection saved for user {}: {}", user.getZohoUserId(), domain);
        return conn;
    }

    /**
     * Activates the given connection and deactivates all others.
     * Also updates user.appDomain so all API calls use the new domain.
     */
    @Transactional
    public AppConnectionEntity activateConnection(UserEntity user, UUID connectionId) {
        AppConnectionEntity conn = appConnectionRepository.findById(connectionId)
                .orElseThrow(() -> new IllegalArgumentException("Connection not found: " + connectionId));

        if (!conn.getUser().getId().equals(user.getId())) {
            throw new IllegalArgumentException("Connection does not belong to this user");
        }
        if (!zohoApiConfig.isAllowedIotRuntimeDomain(conn.getAppDomain())) {
            throw new IllegalArgumentException("Selected connection is not a Zoho IoT Sandbox application");
        }

        // Deactivate all, then activate the selected one
        appConnectionRepository.deactivateAll(user);
        conn.setActive(true);
        appConnectionRepository.save(conn);

        // Sync to user.appDomain so existing service layer picks it up
        user.setAppDomain(conn.getAppDomain());
        userRepository.save(user);

        log.info("Activated connection {} ({}) for user {}", conn.getAppName(), conn.getAppDomain(), user.getZohoUserId());
        return conn;
    }

    /**
     * Removes a saved connection. If it was the active one, activates the next available.
     */
    @Transactional
    public void removeConnection(UserEntity user, UUID connectionId) {
        AppConnectionEntity conn = appConnectionRepository.findById(connectionId)
                .orElseThrow(() -> new IllegalArgumentException("Connection not found: " + connectionId));

        if (!conn.getUser().getId().equals(user.getId())) {
            throw new IllegalArgumentException("Connection does not belong to this user");
        }

        boolean wasActive = conn.isActive();
        appConnectionRepository.delete(conn);

        if (wasActive) {
            // Activate the next available connection
            List<AppConnectionEntity> remaining = listConnections(user);
            if (!remaining.isEmpty()) {
                activateConnection(user, remaining.get(0).getId());
            } else {
                // No connections left — clear the user's app domain
                user.setAppDomain(null);
                userRepository.save(user);
            }
        }
    }

    /**
     * Saves and activates a domain returned by Zoho discovery or OAuth metadata.
     */
    @Transactional
    public void upsertAndActivate(UserEntity user, String appDomain, String appName) {
        if (appDomain == null || appDomain.isBlank()) return;
        AppConnectionEntity conn = addConnection(user, appDomain, appName);
        // Always activate the domain chosen at login time
        activateConnection(user, conn.getId());
    }

    private String extractNameFromDomain(String domain) {
        // e.g. https://app19310rjfay.zohoiot.in → "app19310rjfay"
        try {
            String host = domain.replaceFirst("https?://", "").split("/")[0];
            return host.split("\\.")[0];
        } catch (Exception e) {
            return domain;
        }
    }

    private boolean isValidApplicationDomain(String domain) {
        return zohoApiConfig.isAllowedIotRuntimeDomain(domain);
    }

    @Transactional
    public void clearActiveSelection(UserEntity user) {
        appConnectionRepository.deactivateAll(user);
        user.setAppDomain(null);
        userRepository.save(user);
    }

    private void collectApplications(UserEntity user, JsonNode node, Map<String, String> discovered) {
        if (node == null || node.isNull()) return;

        if (node.isArray()) {
            for (JsonNode item : node) collectApplications(user, item, discovered);
            return;
        }

        if (!node.isObject()) return;

        Optional<String> domain = findDomain(user, node);
        domain.ifPresent(appDomain -> discovered.putIfAbsent(
                zohoApiConfig.normalizeBaseUrl(appDomain),
                findName(node).orElse(extractNameFromDomain(appDomain))));

        for (String key : List.of("applications", "application", "data", "settings", "portals", "portal", "apps")) {
            if (node.has(key)) {
                collectApplications(user, node.get(key), discovered);
            }
        }
    }

    private Optional<String> findDomain(UserEntity user, JsonNode node) {
        for (String key : List.of(
                "app_domain", "application_domain", "domain", "api_domain", "apiDomain",
                "url", "app_url", "application_url", "base_url", "home_url", "access_url",
                "domain_name", "domainName", "link_name", "linkName", "app_link_name", "appLinkName",
                "app_id", "appId", "app_key", "appKey", "application_key", "applicationKey")) {
            if (node.has(key) && node.get(key).isTextual()) {
                String value = node.get(key).asText();
                Optional<String> domain = toApplicationDomain(user, value);
                if (domain.isPresent()) {
                    return domain;
                }
            }
        }

        for (JsonNode child : node) {
            if (child.isObject()) {
                Optional<String> nested = findDomain(user, child);
                if (nested.isPresent()) return nested;
            } else if (child.isTextual()) {
                Optional<String> domain = toApplicationDomain(user, child.asText());
                if (domain.isPresent()) return domain;
            }
        }
        return Optional.empty();
    }

    private Optional<String> toApplicationDomain(UserEntity user, String rawValue) {
        if (rawValue == null || rawValue.isBlank()) {
            return Optional.empty();
        }

        String value = rawValue.trim();
        if (value.startsWith("http://") || value.startsWith("https://") || value.contains(".zohoiot.")) {
            return zohoApiConfig.isIotApplicationDomain(value)
                    ? Optional.of(zohoApiConfig.normalizeBaseUrl(value))
                    : Optional.empty();
        }

        String candidate = value.replaceAll("[^A-Za-z0-9-]", "");
        if (candidate.matches("(?i)^app[A-Za-z0-9-]{4,}$")) {
            return Optional.of(zohoApiConfig.buildIotApplicationDomain(user.getRegion(), candidate));
        }
        return Optional.empty();
    }

    private Optional<String> findName(JsonNode node) {
        for (String key : List.of("name", "display_name", "application_name", "app_name", "portal_name")) {
            if (node.has(key) && node.get(key).isTextual() && !node.get(key).asText().isBlank()) {
                return Optional.of(node.get(key).asText());
            }
        }
        return Optional.empty();
    }

    private String summarizeDiscoveryBody(JsonNode node) {
        if (node == null || node.isNull()) {
            return "empty";
        }

        List<String> keys = new ArrayList<>();
        collectTopLevelKeys(node, keys, 12);

        List<String> domains = new ArrayList<>();
        collectDomainLikeValues(node, domains, 8);

        String keySummary = keys.isEmpty() ? "no object keys" : "keys=" + String.join(",", keys);
        String domainSummary = domains.isEmpty() ? "no zohoiot domains" : "domains=" + String.join(",", domains);
        return keySummary + "; " + domainSummary;
    }

    private void collectTopLevelKeys(JsonNode node, List<String> keys, int limit) {
        if (keys.size() >= limit || node == null || node.isNull()) {
            return;
        }
        if (node.isObject()) {
            Iterator<String> fieldNames = node.fieldNames();
            while (fieldNames.hasNext() && keys.size() < limit) {
                String key = fieldNames.next();
                if (!keys.contains(key)) {
                    keys.add(key);
                }
            }
        } else if (node.isArray() && !node.isEmpty()) {
            collectTopLevelKeys(node.get(0), keys, limit);
        }
    }

    private void collectDomainLikeValues(JsonNode node, List<String> domains, int limit) {
        if (domains.size() >= limit || node == null || node.isNull()) {
            return;
        }

        if (node.isTextual()) {
            String value = node.asText();
            if (value.contains(".zohoiot.") && !domains.contains(value)) {
                domains.add(value.length() > 120 ? value.substring(0, 120) : value);
            }
            return;
        }

        if (node.isObject() || node.isArray()) {
            for (JsonNode child : node) {
                collectDomainLikeValues(child, domains, limit);
                if (domains.size() >= limit) {
                    return;
                }
            }
        }
    }

    public Map<String, Object> toMap(AppConnectionEntity c) {
        return Map.of(
                "id",        c.getId().toString(),
                "appDomain", c.getAppDomain(),
                "appName",   c.getAppName() != null ? c.getAppName() : "",
                "isActive",  c.isActive(),
                "createdAt", c.getCreatedAt().toString()
        );
    }
}
