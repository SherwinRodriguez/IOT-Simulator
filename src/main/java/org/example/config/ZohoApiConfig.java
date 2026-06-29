package org.example.config;

import org.example.entity.UserEntity;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.net.URI;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Resolves Zoho API base URLs based on the user's selected data center region.
 *
 * Supported regions:
 *   in  → accounts.zoho.in  / iot.zoho.in
 *   us  → accounts.zoho.com / iot.zoho.com
 *   eu  → accounts.zoho.eu  / iot.zoho.eu
 *   au  → accounts.zoho.com.au / iot.zoho.com.au
 *   sa  → accounts.zoho.sa  / iot.zoho.sa
 */
@Component
public class ZohoApiConfig {

    @Value("${zoho.client-id}")
    private String clientId;

    @Value("${zoho.client-secret}")
    private String clientSecret;

    @Value("${zoho.redirect-uri}")
    private String redirectUri;

    /** Default region used for the initial OAuth login redirect */
    @Value("${zoho.default-region:in}")
    private String defaultRegion;

    /**
     * Deployment-managed list of Zoho IoT sandbox domains.
     * Format: "Simulator|https://app123.zohoiot.in,Testing|https://app456.zohoiot.in"
     * The backend validates each domain with the signed-in user's OAuth token
     * before showing it, so users never type a domain manually.
     */
    @Value("${zoho.iot.applications:}")
    private String configuredIotApplications;

    public String getClientId()     { return clientId; }
    public String getClientSecret() { return clientSecret; }
    public String getRedirectUri()  { return redirectUri; }
    public String getDefaultRegion(){ return defaultRegion; }

    public Map<String, String> getConfiguredIotApplications(String region) {
        LinkedHashMap<String, String> apps = new LinkedHashMap<>();
        if (configuredIotApplications == null || configuredIotApplications.isBlank()) {
            return apps;
        }

        for (String entry : configuredIotApplications.split("[;,]")) {
            String trimmed = entry.trim();
            if (trimmed.isBlank()) {
                continue;
            }

            String name;
            String domainValue;
            if (trimmed.contains("|")) {
                String[] parts = trimmed.split("\\|", 2);
                name = parts[0].trim();
                domainValue = parts[1].trim();
            } else if (trimmed.contains("=")) {
                String[] parts = trimmed.split("=", 2);
                name = parts[0].trim();
                domainValue = parts[1].trim();
            } else {
                domainValue = trimmed;
                name = trimmed;
            }

            String domain = buildIotApplicationDomain(region, domainValue);
            if (isIotApplicationDomain(domain)) {
                apps.put(domain, name.isBlank() ? extractAppName(domain) : name);
            }
        }
        return apps;
    }

    public String getAccountsBaseUrl(String region) {
        return switch (region.toLowerCase()) {
            case "us"         -> "https://accounts.zoho.com";
            case "eu"         -> "https://accounts.zoho.eu";
            case "au"         -> "https://accounts.zoho.com.au";
            case "sa"         -> "https://accounts.zoho.sa";
            default           -> "https://accounts.zoho.in";  // "in"
        };
    }

    public String getIotBaseUrl(String region) {
        return switch (region.toLowerCase()) {
            case "us"         -> "https://www.zohoapis.com";
            case "eu"         -> "https://www.zohoapis.eu";
            case "au"         -> "https://www.zohoapis.com.au";
            case "sa"         -> "https://www.zohoapis.sa";
            default           -> "https://www.zohoapis.in";        // "in"
        };
    }

    public String getIotApplicationHostSuffix(String region) {
        return switch (region.toLowerCase()) {
            case "us"         -> "zohoiot.com";
            case "eu"         -> "zohoiot.eu";
            case "au"         -> "zohoiot.com.au";
            case "sa"         -> "zohoiot.sa";
            default           -> "zohoiot.in";
        };
    }

    public String buildIotApplicationDomain(String region, String appIdentifier) {
        String value = appIdentifier.trim();
        if (value.startsWith("http://") || value.startsWith("https://") || value.contains(".zohoiot.")) {
            return normalizeBaseUrl(value);
        }
        return "https://" + value + "." + getIotApplicationHostSuffix(region);
    }

    public String getIotApiBaseUrl(UserEntity user) {
        if (hasValidIotRuntimeDomain(user)) {
            return normalizeBaseUrl(user.getAppDomain());
        }
        throw new IllegalStateException("Select a Zoho IoT Sandbox application before using devices, models, or datapoints.");
    }

    public String normalizeBaseUrl(String rawUrl) {
        String normalized = rawUrl.trim();
        if (!normalized.startsWith("http://") && !normalized.startsWith("https://")) {
            normalized = "https://" + normalized;
        }
        URI uri = URI.create(normalized);
        String host = uri.getHost();
        if (host == null || host.isBlank()) {
            throw new IllegalArgumentException("Invalid Zoho IoT application domain");
        }
        int port = uri.getPort();
        return uri.getScheme() + "://" + host + (port > -1 ? ":" + port : "");
    }

    public String extractAppName(String domain) {
        String host = URI.create(normalizeBaseUrl(domain)).getHost();
        if (host == null || host.isBlank()) {
            return domain;
        }
        return host.split("\\.")[0];
    }

    public boolean hasValidIotApplicationDomain(UserEntity user) {
        return user != null && isIotApplicationDomain(user.getAppDomain());
    }

    public boolean hasValidIotRuntimeDomain(UserEntity user) {
        return user != null && isAllowedIotRuntimeDomain(user.getAppDomain());
    }

    public boolean isIotApplicationDomain(String rawUrl) {
        if (rawUrl == null || rawUrl.isBlank()) {
            return false;
        }
        try {
            String host = URI.create(normalizeBaseUrl(rawUrl)).getHost();
            return host != null && host.toLowerCase().contains(".zohoiot.");
        } catch (Exception e) {
            return false;
        }
    }

    public boolean isRegionalIotApiDomain(String rawUrl) {
        if (rawUrl == null || rawUrl.isBlank()) {
            return false;
        }
        try {
            String host = URI.create(normalizeBaseUrl(rawUrl)).getHost();
            return host != null && host.toLowerCase().startsWith("www.zohoapis.");
        } catch (Exception e) {
            return false;
        }
    }

    public boolean isAllowedIotRuntimeDomain(String rawUrl) {
        return isIotApplicationDomain(rawUrl);
    }

    public String getAuthorizationUrl(String region, String state) {
        return getAccountsBaseUrl(region)
               + "/oauth/v2/auth"
               + "?response_type=code"
               + "&client_id=" + clientId
               + "&scope=ZohoIOT.modules.ALL,ZohoIOT.modules.devices.ALL,ZohoIOT.modules.datapoints.ALL,ZohoIOT.settings.cirrus.data.READ,ZohoIOT.settings.cirrus.data.CREATE,ZohoIOT.modules.datapoints.data.CREATE,AaaServer.profile.READ,ZohoIOT.modules.products.ALL,ZohoIOT.settings.product_gallery.READ,ZohoIOT.settings.product_gallery.CREATE"
               + "&redirect_uri=" + redirectUri
               + "&access_type=offline"
               + "&prompt=consent"
               + "&state=" + state;
    }
}
