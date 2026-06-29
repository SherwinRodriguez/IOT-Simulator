package org.example.zoho;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.example.auth.ZohoOAuthService;
import org.example.config.ZohoApiConfig;
import org.example.entity.AppConnectionEntity;
import org.example.entity.DeviceEntity;
import org.example.entity.ModelEntity;
import org.example.entity.UserEntity;

import org.example.mqtt.MqttPublisher;
import org.example.repository.AppConnectionRepository;
import org.example.repository.DeviceRepository;
import org.example.repository.ModelRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.*;
import org.example.security.EncryptionService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Fetches devices from the Zoho IoT Devices API and upserts them into the local database.
 *
 * API: GET https://iot.zoho.{region}/api/v1/devices
 */
@Service
public class DeviceSyncService {

    private static final Logger log = LoggerFactory.getLogger(DeviceSyncService.class);

    private final ZohoApiConfig zohoApiConfig;
    private final ZohoOAuthService oauthService;
    private final DeviceRepository deviceRepository;
    private final AppConnectionRepository appConnectionRepository;
    private final ModelRepository modelRepository;
    private final EncryptionService encryptionService;
    private final ObjectMapper objectMapper;
    private final RestTemplate restTemplate;

    public DeviceSyncService(ZohoApiConfig zohoApiConfig,
                              ZohoOAuthService oauthService,
                              DeviceRepository deviceRepository,
                              AppConnectionRepository appConnectionRepository,
                              ModelRepository modelRepository,
                              EncryptionService encryptionService) {
        this.zohoApiConfig      = zohoApiConfig;
        this.oauthService       = oauthService;
        this.deviceRepository   = deviceRepository;
        this.appConnectionRepository = appConnectionRepository;
        this.modelRepository = modelRepository;
        this.encryptionService  = encryptionService;
        this.objectMapper       = new ObjectMapper();
        this.restTemplate       = new RestTemplate();
    }

    /**
     * Sync all devices from Zoho IoT for the given user.
     * Returns the list of synced DeviceEntity objects.
     */
    @Transactional
    public List<DeviceEntity> syncDevices(UserEntity user) throws Exception {
        AppConnectionEntity sandbox = requireActiveSandbox(user);
        String accessToken = oauthService.getValidAccessToken(user);
        String apiBaseUrl = zohoApiConfig.getIotApiBaseUrl(user);
        String url = apiBaseUrl + "/iot/v1/devices";

        String appDomain = sandbox.getAppDomain();

        log.info("Syncing devices for user {} from {} (appDomain key: {})", user.getZohoUserId(), url, appDomain);

        HttpHeaders headers = new HttpHeaders();
        headers.set("Authorization", "Zoho-oauthtoken " + accessToken);
        headers.set("Accept", "application/json");

        ResponseEntity<String> response = restTemplate.exchange(
                url, HttpMethod.GET, new HttpEntity<>(headers), String.class);

        if (response.getBody() == null || response.getBody().trim().isEmpty()) {
            log.info("ZOHO IoT returned empty response (no devices).");
            return new ArrayList<>();
        }

        JsonNode root = objectMapper.readTree(response.getBody());
        JsonNode devicesNode = root;
        if (root.has("devices")) devicesNode = root.get("devices");
        else if (root.has("data")) devicesNode = root.get("data");

        List<DeviceEntity> synced = new ArrayList<>();
        List<String> syncedDeviceIds = new ArrayList<>();

        if (devicesNode.isArray()) {
            for (JsonNode deviceNode : devicesNode) {
                DeviceEntity device = upsertDevice(user, sandbox, accessToken, deviceNode, appDomain);
                if (device != null) {
                    synced.add(device);
                    syncedDeviceIds.add(device.getZohoDeviceId());
                }
            }
        }

        // Full Sync: Remove any devices from the local DB that belong to the user
        // but were not returned in this sync. This handles the case where the user
        // switches sandboxes and the old sandbox's devices should no longer appear.
        List<DeviceEntity> existingDevices = deviceRepository.findBySandbox(sandbox);
        for (DeviceEntity existing : existingDevices) {
            if (!syncedDeviceIds.contains(existing.getZohoDeviceId())) {
                log.info("Deleting local device {} because it was not in the sync response", existing.getZohoDeviceId());
                deviceRepository.delete(existing);
            }
        }

        log.info("Synced {} devices for user {} in appDomain {}", synced.size(), user.getZohoUserId(), appDomain);
        return synced;
    }

    public List<JsonNode> getModels(UserEntity user) throws Exception {
        AppConnectionEntity sandbox = requireActiveSandbox(user);
        String accessToken = oauthService.getValidAccessToken(user);
        String baseUrl = zohoApiConfig.getIotApiBaseUrl(user);
        String url = baseUrl + "/iot/v1/settings/models?module=devices&view_mode=list&check_permission_view=true";

        HttpHeaders headers = new HttpHeaders();
        headers.set("Authorization", "Zoho-oauthtoken " + accessToken);
        headers.set("Accept", "application/json");

        ResponseEntity<String> response = restTemplate.exchange(
                url, HttpMethod.GET, new HttpEntity<>(headers), String.class);
        
        JsonNode root = objectMapper.readTree(response.getBody());
        List<JsonNode> modelsList = new ArrayList<>();
        
        JsonNode modelsNode = root.has("models") ? root.get("models") : root.get("data");
        if (modelsNode != null && modelsNode.isArray()) {
            for (JsonNode model : modelsNode) {
                if (model.has("id")) {
                    ModelEntity saved = upsertModel(sandbox, model);

                    ObjectNode mapped = objectMapper.createObjectNode();
                    mapped.put("id", saved.getZohoModelId());
                    mapped.put("name", saved.getDisplayName() != null ? saved.getDisplayName() : saved.getName());

                    if (model.has("type") && model.get("type").has("name")) {
                        mapped.put("type", model.get("type").get("name").asText());
                    } else {
                        mapped.put("type", "Device");
                    }

                    if (model.has("status")) {
                        mapped.put("status", model.get("status").asText());
                    }
                    modelsList.add(mapped);
                }
            }
        }
        return modelsList;
    }

    private DeviceEntity upsertDevice(UserEntity user, AppConnectionEntity sandbox, String accessToken, JsonNode node, String appDomain) {
        String zohoDeviceId = node.has("device_id") ? node.get("device_id").asText()
                : (node.has("id") ? node.get("id").asText() : null);
        if (zohoDeviceId == null) return null;

        DeviceEntity device = deviceRepository
                .findBySandboxAndZohoDeviceId(sandbox, zohoDeviceId)
                .or(() -> deviceRepository.findByZohoDeviceIdAndUserAndAppDomain(zohoDeviceId, user, appDomain))
                .orElseGet(DeviceEntity::new);

        device.setUser(user);
        device.setSandbox(sandbox);
        device.setAppDomain(appDomain);
        device.setZohoDeviceId(zohoDeviceId);
        device.setName(getStr(node, "device_name", "name", "Unknown Device"));
        device.setDeviceType(getStr(node, "device_type", "type", null));
        device.setConnectivity(getStr(node, "connectivity_type", "connectivity", null));

        // Extract model name from the layout/model object (Zoho returns model info here)
        String modelName = null;
        if (node.has("layout") && node.get("layout").has("name")) {
            modelName = node.get("layout").get("name").asText();
        } else if (node.has("model") && node.get("model").has("name")) {
            modelName = node.get("model").get("name").asText();
        }
        // Store model name as deviceType only if deviceType is not already set meaningfully
        if (device.getDeviceType() == null && modelName != null) {
            device.setDeviceType(modelName);
        }

        // Extract MQTT credentials from Zoho response
        if (node.has("mqtt") || node.has("credentials")) {
            JsonNode creds = node.has("mqtt") ? node.get("mqtt") : node.get("credentials");
            device.setMqttClientId(getStr(creds, "client_id", "clientId", null));
            device.setMqttUsername(getStr(creds, "username", "user_name", null));
            String rawPassword = getStr(creds, "device_token", "password", "token", null);
            if (rawPassword != null) {
                device.setMqttPassword(encryptionService.encrypt(rawPassword));
            }
            String serverUri = getStr(creds, "server_uri", "mqtt_host", "host");
            if (serverUri != null) {
                device.setMqttBrokerUrl(normalizeBrokerUrl(serverUri, getInt(creds, 1883, "port", "mqtt_port")));
            }
            String publishTopic = extractPublishTopic(creds);
            if (publishTopic != null) {
                device.setPublishTopic(publishTopic);
            }
        } else {
            // Fetch credentials
            try {
                String credsUrl = zohoApiConfig.getIotApiBaseUrl(user) + "/iot/v1/devices/" + zohoDeviceId + "/actions/connect_credentials";
                HttpHeaders headers = new HttpHeaders();
                headers.set("Authorization", "Zoho-oauthtoken " + accessToken);
                ResponseEntity<String> credsRes = restTemplate.exchange(credsUrl, HttpMethod.GET, new HttpEntity<>(headers), String.class);
                JsonNode credsRoot = objectMapper.readTree(credsRes.getBody());
                if (credsRoot.has("data")) {
                    JsonNode data = credsRoot.get("data");
                    
                    // Client ID is 'device_id'
                    device.setMqttClientId(getStr(data, "device_id", "client_id", "clientId"));
                    
                    // Username is 'user_name'
                    device.setMqttUsername(getStr(data, "user_name", "username"));
                    if (device.getMqttUsername() == null) device.setMqttUsername(device.getMqttClientId());
                    
                    // Password is 'device_token'
                    String rawPassword = getStr(data, "device_token", "client_secret", "password");
                    if (rawPassword != null) {
                        device.setMqttPassword(encryptionService.encrypt(rawPassword));
                    }

                    // Extract per-device MQTT broker URL from server_uri + port
                    String serverUri = getStr(data, "server_uri", "mqtt_host", "host");
                    if (serverUri != null) {
                        int port = getInt(data, 1883, "port", "mqtt_port");
                        device.setMqttBrokerUrl(normalizeBrokerUrl(serverUri, port));
                        log.info("Device {} broker URL set to: {}", zohoDeviceId, device.getMqttBrokerUrl());
                    }

                    // Extract publish topic from the same connect_credentials response if available
                    String publishTopic = extractPublishTopic(data);
                    if (publishTopic != null) {
                        device.setPublishTopic(publishTopic);
                    }
                }
            } catch (Exception e) {
                log.warn("Failed to fetch credentials for device {}: {}", zohoDeviceId, e.getMessage());
            }
        }

        if (device.getPublishTopic() == null) {
            if (node.has("topics") && node.get("topics").isArray() && node.get("topics").size() > 0) {
                device.setPublishTopic(node.get("topics").get(0).asText());
            } else if (node.has("publish_topic")) {
                device.setPublishTopic(node.get("publish_topic").asText());
            } else {
                // Fetch topics fallback
                try {
                    String topicsUrl = zohoApiConfig.getIotApiBaseUrl(user) + "/iot/v1/devices/" + zohoDeviceId + "/actions/publish_topics";
                    HttpHeaders headers = new HttpHeaders();
                    headers.set("Authorization", "Zoho-oauthtoken " + accessToken);
                    ResponseEntity<String> topicsRes = restTemplate.exchange(topicsUrl, HttpMethod.GET, new HttpEntity<>(headers), String.class);
                    JsonNode topicsRoot = objectMapper.readTree(topicsRes.getBody());
                    String topic = extractPublishTopic(topicsRoot);
                    if (topic != null) {
                        device.setPublishTopic(topic);
                    }
                } catch (Exception e) {
                    log.warn("Failed to fetch publish topics for device {}: {}", zohoDeviceId, e.getMessage());
                }
            }
        }

        if (device.getMqttBrokerUrl() == null && device.getMqttUsername() != null) {
            deriveBrokerUrlFromUsername(device.getMqttUsername())
                    .ifPresent(device::setMqttBrokerUrl);
        }

        if (node.has("model_id") && !node.get("model_id").isNull()) {
            device.setZohoModelId(node.get("model_id").asText());
        } else if (node.has("layout") && node.get("layout").has("id")) {
            device.setZohoModelId(node.get("layout").get("id").asText());
            // If we haven't set deviceType yet, use the layout name as the model label
            if (device.getDeviceType() == null && node.get("layout").has("name")) {
                device.setDeviceType(node.get("layout").get("name").asText());
            }
        } else if (node.has("model") && node.get("model").has("id")) {
            device.setZohoModelId(node.get("model").get("id").asText());
        }

        if (device.getZohoModelId() != null) {
            modelRepository.findBySandboxAndZohoModelId(sandbox, device.getZohoModelId())
                    .ifPresent(device::setModel);
        }

        device.setLastSyncedAt(Instant.now());
        return deviceRepository.save(device);
    }

    /**
     * Create a new device in Zoho IoT and sync it locally.
     * Uses Flow 4 (Direct API Endpoint).
     */
    @Transactional
    public DeviceEntity createDevice(UserEntity user, String name, String description, String modelId) throws Exception {
        AppConnectionEntity sandbox = requireActiveSandbox(user);
        String accessToken = oauthService.getValidAccessToken(user);
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(accessToken);
        headers.setContentType(MediaType.APPLICATION_JSON);

        String baseUrl = zohoApiConfig.getIotApiBaseUrl(user);
        String url = baseUrl + "/iot/v1/devices";

        // Flow 4: Direct API Endpoint (Minimal)
        ObjectMapper mapper = new ObjectMapper();
        var rootNode = mapper.createObjectNode();
        var deviceNode = mapper.createObjectNode();

        deviceNode.put("name", name);
        if (description != null && !description.isEmpty()) {
            deviceNode.put("description", description);
        }
        
        // Connectivity Type
        var connNode = mapper.createObjectNode();
        connNode.put("id", "mqtt");
        connNode.put("name", "MQTT");
        deviceNode.set("connectivity_type", connNode);

        // Authentication Type: Security Token without TLS
        var authNode = mapper.createObjectNode();
        authNode.put("id", "security_token_without_tls");
        authNode.put("name", "Security Token without TLS");
        deviceNode.set("authentication_type", authNode);

        // Device Type
        var typeNode = mapper.createObjectNode();
        typeNode.put("id", "direct_endpoint");
        typeNode.put("name", "Direct Endpoint");
        deviceNode.set("device_type", typeNode);

        if (modelId != null && !modelId.isEmpty()) {
            deviceNode.put("model_id", modelId);
        }

        rootNode.set("devices", deviceNode);

        headers.set("Authorization", "Zoho-oauthtoken " + accessToken);
        headers.set("Accept", "application/json");

        String payload = mapper.writeValueAsString(rootNode);
        log.info("Creating device in Zoho IoT: {}", payload);

        ResponseEntity<String> response = restTemplate.exchange(
                url, HttpMethod.POST, new HttpEntity<>(payload, headers), String.class);

        log.info("Zoho IoT create device response status: {}", response.getStatusCode());
        JsonNode resNode = objectMapper.readTree(response.getBody());

        String newDeviceId = extractCreatedDeviceId(resNode).orElse(null);
        log.info("Created Zoho IoT device '{}' with id candidate {}", name, newDeviceId);

        for (int attempt = 1; attempt <= 5; attempt++) {
            List<DeviceEntity> synced = syncDevices(user);

            if (newDeviceId != null) {
                Optional<DeviceEntity> byId = deviceRepository.findBySandboxAndZohoDeviceId(sandbox, newDeviceId);
                if (byId.isPresent()) {
                    return byId.get();
                }
            }

            Optional<DeviceEntity> byName = synced.stream()
                    .filter(device -> device.getName() != null && device.getName().equalsIgnoreCase(name))
                    .findFirst();
            if (byName.isPresent()) {
                return byName.get();
            }

            if (attempt < 5) {
                Thread.sleep(1200L * attempt);
            }
        }

        return deviceRepository.findBySandbox(sandbox).stream()
                .filter(device -> device.getName() != null && device.getName().equalsIgnoreCase(name))
                .findFirst()
                .orElseThrow(() -> new IllegalStateException("Device was created in Zoho, but it was not visible in the device list yet. Please sync again in a few seconds."));
    }

    public DeviceEntity registerDevice(UserEntity user, UUID deviceId) throws Exception {
        AppConnectionEntity sandbox = requireActiveSandbox(user);

        syncDevices(user);
        DeviceEntity device = deviceRepository.findById(deviceId)
                .filter(d -> d.getSandbox() != null && sandbox.getId().equals(d.getSandbox().getId()))
                .orElseThrow(() -> new IllegalArgumentException("Device not found in the active sandbox"));

        if (isBlank(device.getMqttBrokerUrl()) && !isBlank(device.getMqttUsername())) {
            deriveBrokerUrlFromUsername(device.getMqttUsername()).ifPresent(device::setMqttBrokerUrl);
            deviceRepository.save(device);
        }

        validateConnectCredentials(device);

        String mqttPassword = encryptionService.decrypt(device.getMqttPassword());
        MqttPublisher registrationClient = null;
        try {
            registrationClient = new MqttPublisher(
                    device.getMqttBrokerUrl(),
                    device.getMqttClientId(),
                    device.getMqttUsername(),
                    mqttPassword,
                    device.getPublishTopic()
            );
            Thread.sleep(1500);
        } finally {
            if (registrationClient != null) {
                try {
                    registrationClient.disconnect();
                } catch (Exception e) {
                    log.warn("Failed to disconnect registration MQTT client for device {}: {}", device.getZohoDeviceId(), e.getMessage());
                }
            }
        }

        List<DeviceEntity> synced = syncDevices(user);
        return synced.stream()
                .filter(d -> device.getZohoDeviceId().equals(d.getZohoDeviceId()))
                .findFirst()
                .orElseGet(() -> deviceRepository.findById(deviceId).orElse(device));
    }

    private AppConnectionEntity requireActiveSandbox(UserEntity user) {
        return appConnectionRepository.findByUserAndActiveTrue(user)
                .filter(sandbox -> sandbox.getAppDomain() != null
                        && sandbox.getAppDomain().equals(user.getAppDomain()))
                .orElseThrow(() -> new IllegalStateException(
                        "Select a Zoho IoT Sandbox application before using devices, models, or datapoints."));
    }

    private ModelEntity upsertModel(AppConnectionEntity sandbox, JsonNode model) {
        String zohoModelId = model.get("id").asText();
        ModelEntity entity = modelRepository.findBySandboxAndZohoModelId(sandbox, zohoModelId)
                .orElseGet(ModelEntity::new);

        String name = getStr(model, "name", "display_name", "Unnamed Model");
        String displayName = getStr(model, "display_name", "name", name);

        entity.setSandbox(sandbox);
        entity.setZohoModelId(zohoModelId);
        entity.setName(name);
        entity.setDisplayName(displayName);
        entity.setModuleApiName(getStr(model, "module_api_name", "module", "devices"));
        entity.setStatus(getStr(model, "status"));
        return modelRepository.save(entity);
    }

    private String getStr(JsonNode node, String... keys) {
        for (String key : keys) {
            if (node.has(key) && !node.get(key).isNull() && !node.get(key).asText().isBlank()) {
                return node.get(key).asText();
            }
        }
        return null;
    }

    private int getInt(JsonNode node, int fallback, String... keys) {
        for (String key : keys) {
            if (node.has(key) && !node.get(key).isNull()) {
                if (node.get(key).isInt() || node.get(key).isLong()) {
                    return node.get(key).asInt(fallback);
                }
                try {
                    return Integer.parseInt(node.get(key).asText());
                } catch (Exception ignored) {
                    return fallback;
                }
            }
        }
        return fallback;
    }

    private void validateConnectCredentials(DeviceEntity device) {
        List<String> missing = new ArrayList<>();
        if (isBlank(device.getMqttBrokerUrl())) missing.add("broker URL");
        if (isBlank(device.getMqttClientId())) missing.add("client ID");
        if (isBlank(device.getMqttUsername())) missing.add("username");
        if (isBlank(device.getMqttPassword())) missing.add("device token");

        if (!missing.isEmpty()) {
            throw new IllegalStateException("Zoho did not return MQTT " + String.join(", ", missing)
                    + " for this device. Open the device onboarding in Zoho IoT, confirm it uses MQTT with Security Token, then try Register again.");
        }
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }

    private String normalizeBrokerUrl(String serverUri, int port) {
        String value = serverUri.trim();
        if (value.startsWith("/")) {
            value = value.substring(1);
        }
        if (value.startsWith("mqtt://")) {
            value = "tcp://" + value.substring("mqtt://".length());
        }
        if (value.startsWith("mqtts://")) {
            value = "ssl://" + value.substring("mqtts://".length());
        }
        if (value.startsWith("tcp://") || value.startsWith("ssl://")) {
            return value.matches("^[a-z]+://[^:]+:\\d+.*$") ? value : value + ":" + port;
        }
        String protocol = (port == 8883) ? "ssl" : "tcp";
        return protocol + "://" + value + ":" + port;
    }

    private Optional<String> deriveBrokerUrlFromUsername(String username) {
        String value = username.trim();
        int hostStart = value.startsWith("/") ? 1 : 0;
        int hostEnd = value.indexOf('/', hostStart);
        if (hostEnd <= hostStart) {
            return Optional.empty();
        }

        String host = value.substring(hostStart, hostEnd);
        if (!host.contains(".zohoiothub.")) {
            return Optional.empty();
        }
        return Optional.of("tcp://" + host + ":1883");
    }

    private String extractPublishTopic(JsonNode node) {
        String direct = getStr(node, "publish_topic", "topic", "topic_name");
        if (direct != null) return direct;

        if (node.has("mqtt_topics")) {
            String topic = extractPublishTopic(node.get("mqtt_topics"));
            if (topic != null) return topic;
        }

        for (String key : List.of("publish_topic", "publish_topics", "data")) {
            if (!node.has(key)) continue;
            JsonNode candidate = node.get(key);
            if (candidate.isTextual() && !candidate.asText().isBlank()) {
                return candidate.asText();
            }
            if (candidate.isArray() && candidate.size() > 0) {
                for (JsonNode item : candidate) {
                    String topic = item.isTextual() ? item.asText() : getStr(item, "topic_name", "topic", "name");
                    if (topic != null && !topic.isBlank()) return topic;
                }
            }
            if (candidate.isObject()) {
                String topic = extractPublishTopic(candidate);
                if (topic != null) return topic;
            }
        }
        return null;
    }

    private Optional<String> extractCreatedDeviceId(JsonNode node) {
        if (node == null || node.isNull()) return Optional.empty();
        if (node.isObject()) {
            for (String key : List.of("device_id", "id")) {
                if (node.has(key) && node.get(key).isValueNode() && !node.get(key).asText().isBlank()) {
                    return Optional.of(node.get(key).asText());
                }
            }
            for (String key : List.of("details", "device", "devices", "data", "result")) {
                if (node.has(key)) {
                    Optional<String> found = extractCreatedDeviceId(node.get(key));
                    if (found.isPresent()) return found;
                }
            }
        }
        if (node.isArray()) {
            for (JsonNode child : node) {
                Optional<String> found = extractCreatedDeviceId(child);
                if (found.isPresent()) return found;
            }
        }
        return Optional.empty();
    }

}
