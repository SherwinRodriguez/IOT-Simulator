package org.example.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import org.example.auth.ZohoOAuthService;
import org.example.config.ZohoApiConfig;
import org.example.entity.DeviceEntity;
import org.example.entity.SimulationConfigEntity;
import org.example.entity.UserEntity;
import org.example.repository.DeviceRepository;
import org.example.repository.SimulationConfigRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.*;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;

import java.util.*;

@RestController
@RequestMapping("/api/devices/{deviceId}/datapoints")
public class DatapointController {

    private static final Logger log = LoggerFactory.getLogger(DatapointController.class);

    private final DeviceRepository deviceRepository;
    private final SimulationConfigRepository simConfigRepository;
    private final ZohoApiConfig zohoApiConfig;
    private final ZohoOAuthService oauthService;
    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;
    private final org.example.service.SimulationManagerService simulationManagerService;

    public DatapointController(DeviceRepository deviceRepository,
                                SimulationConfigRepository simConfigRepository,
                                ZohoApiConfig zohoApiConfig,
                                ZohoOAuthService oauthService,
                                org.example.service.SimulationManagerService simulationManagerService) {
        this.deviceRepository = deviceRepository;
        this.simConfigRepository = simConfigRepository;
        this.zohoApiConfig = zohoApiConfig;
        this.oauthService = oauthService;
        this.simulationManagerService = simulationManagerService;
        this.restTemplate = new RestTemplate();
        this.objectMapper = new ObjectMapper();
    }

    @GetMapping
    public ResponseEntity<?> listDatapoints(
            @PathVariable UUID deviceId,
            @AuthenticationPrincipal UserEntity user) {
        return deviceRepository.findByIdAndUser(deviceId, user).map(device -> {
            if (device.getZohoModelId() == null) {
                return ResponseEntity.badRequest().body(Map.of("error", "Device is missing Zoho Model ID. Please sync devices again."));
            }

            try {
                String token = oauthService.getValidAccessToken(user);
                String url = zohoApiConfig.getIotBaseUrl(user.getRegion()) + "/iot/v1/datapointdefinitions?model=" + device.getZohoModelId();

                HttpHeaders headers = new HttpHeaders();
                headers.set("Authorization", "Zoho-oauthtoken " + token);
                ResponseEntity<String> response = restTemplate.exchange(url, HttpMethod.GET, new HttpEntity<>(headers), String.class);
                
                log.info("RAW DATAPOINT RESPONSE: {}", response.getBody());

                JsonNode root = objectMapper.readTree(response.getBody());
                JsonNode dpNodes = root.has("datapointdefinitions") ? root.get("datapointdefinitions") : root.get("data");

                List<SimulationConfigEntity> localConfigs = simConfigRepository.findByDeviceId(deviceId);

                List<Map<String, Object>> result = new ArrayList<>();
                if (dpNodes != null && dpNodes.isArray()) {
                    for (JsonNode dp : dpNodes) {
                        String id = dp.has("id") ? dp.get("id").asText() : UUID.randomUUID().toString();
                        String name = dp.has("datapoint_name") ? dp.get("datapoint_name").asText() : "Unknown";
                        String dataType = dp.has("data_type") ? dp.get("data_type").asText() : "Numeric";
                        String unit = (dp.has("unit") && dp.get("unit").has("name")) ? dp.get("unit").get("name").asText() : "";
                        
                        String parsingKey = name;
                        if (dp.has("parsing_key_object") && dp.get("parsing_key_object").has("value")) {
                            parsingKey = dp.get("parsing_key_object").get("value").asText();
                        }

                        Map<String, Object> dpObj = new HashMap<>();
                        dpObj.put("id", id); // Zoho definition ID
                        dpObj.put("name", name);
                        dpObj.put("dataType", dataType);
                        dpObj.put("unit", unit);
                        dpObj.put("parsingKey", parsingKey);

                        // Attach local simulation config
                        String finalParsingKey = parsingKey;
                        Optional<SimulationConfigEntity> existingCfg = localConfigs.stream().filter(c -> c.getParsingKey().equals(finalParsingKey)).findFirst();
                        if (existingCfg.isPresent()) {
                            dpObj.put("simulationConfig", existingCfg.get());
                        } else {
                            SimulationConfigEntity config = new SimulationConfigEntity();
                            config.setDeviceId(deviceId);
                            config.setParsingKey(finalParsingKey);
                            config.setPattern("RANDOM");
                            config.setMinValue(0.0);
                            config.setMaxValue(100.0);
                            config.setStartValue(50.0);
                            config.setStepValue(1.0);
                            config.setPublishIntervalMs(5000);
                            simConfigRepository.save(config);
                            localConfigs.add(config);
                            dpObj.put("simulationConfig", config);
                        }

                        result.add(dpObj);
                    }
                }

                return ResponseEntity.ok(result);
            } catch (Exception e) {
                log.error("Failed to fetch datapoints from Zoho", e);
                return ResponseEntity.status(HttpStatus.BAD_GATEWAY).body(Map.of("error", e.getMessage()));
            }
        }).orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<?> addDatapoint(@PathVariable UUID deviceId,
                                           @Valid @RequestBody DatapointCreateRequest request,
                                           @AuthenticationPrincipal UserEntity user) {
        return deviceRepository.findByIdAndUser(deviceId, user).map(device -> {
            if (device.getZohoModelId() == null) {
                return ResponseEntity.badRequest().body(Map.of("error", "Device is missing Zoho Model ID."));
            }

            try {
                String token = oauthService.getValidAccessToken(user);
                HttpHeaders headers = new HttpHeaders();
                headers.set("Authorization", "Zoho-oauthtoken " + token);
                headers.setContentType(MediaType.APPLICATION_JSON);

                String url = zohoApiConfig.getIotBaseUrl(user.getRegion()) + "/iot/v1/datapointdefinitions";

                ObjectNode root = objectMapper.createObjectNode();
                ObjectNode dpDef = root.putObject("datapointdefinitions");
                
                dpDef.putObject("active").put("id", true);
                dpDef.putObject("datapoint_type").put("id", "realtime");
                String rawType = request.dataType() != null ? request.dataType().toLowerCase() : "numeric";
                String mappedDataType;
                if (rawType.equals("string")) mappedDataType = "String";
                else if (rawType.equals("boolean")) mappedDataType = "Boolean";
                else mappedDataType = "Numeric";
                
                dpDef.put("data_type", mappedDataType);
                dpDef.put("decimal_places", 2);
                dpDef.put("datapoint_name", request.name());

                ObjectNode parentModel = dpDef.putObject("parent_model");
                ObjectNode infoObj = parentModel.putObject("info");
                infoObj.put("id", device.getZohoModelId());
                ObjectNode moduleObj = infoObj.putObject("module");
                moduleObj.put("api_name", "models");
                parentModel.put("type", "model");
                dpDef.put("parent_type", "model");
                
                // Dynamically fetch a valid kind ID from existing datapoints
                String dpListUrl = zohoApiConfig.getIotBaseUrl(user.getRegion()) + "/iot/v1/datapointdefinitions?model=" + device.getZohoModelId();
                ResponseEntity<String> dpListResp = restTemplate.exchange(dpListUrl, HttpMethod.GET, new HttpEntity<>(headers), String.class);
                JsonNode dpListRoot = objectMapper.readTree(dpListResp.getBody());
                JsonNode dpNodes = dpListRoot.has("datapointdefinitions") ? dpListRoot.get("datapointdefinitions") : dpListRoot.get("data");
                
                String kindId = null;
                if (dpNodes != null && dpNodes.isArray()) {
                    for (JsonNode node : dpNodes) {
                        if (node.has("data_type") && node.get("data_type").asText().equalsIgnoreCase(mappedDataType)) {
                            if (node.has("kind") && node.get("kind").has("id")) {
                                kindId = node.get("kind").get("id").asText();
                                break;
                            }
                        }
                    }
                    if (kindId == null && dpNodes.size() > 0 && dpNodes.get(0).has("kind") && dpNodes.get(0).get("kind").has("id")) {
                        kindId = dpNodes.get(0).get("kind").get("id").asText();
                    }
                }
                
                if (kindId != null) {
                    ObjectNode kindObj = dpDef.putObject("kind");
                    kindObj.put("id", kindId);
                }

                ObjectNode pkObj = dpDef.putObject("parsing_key_object");
                pkObj.put("parsing_type", "direct");
                String pKey = (request.parsingKey() != null && !request.parsingKey().isBlank()) ? request.parsingKey() : request.name().replaceAll("\\s+", "_").toLowerCase();
                pkObj.put("label", pKey);
                pkObj.put("value", pKey);

                if (request.unit() != null && !request.unit().isBlank()) {
                    // For now, if we don't have unit ID from Zoho, it might fail or ignore. 
                    // Let's just omit unit or try passing name if zoho accepts it.
                }


                log.info("Sending Datapoint Payload to Zoho: {}", root.toPrettyString());

                ResponseEntity<String> response = restTemplate.exchange(url, HttpMethod.POST, new HttpEntity<>(root.toString(), headers), String.class);

                // Initialize local simulation config
                SimulationConfigEntity config = simConfigRepository.findByDeviceIdAndParsingKey(deviceId, pKey).orElse(new SimulationConfigEntity());
                config.setDeviceId(deviceId);
                config.setParsingKey(pKey);
                config.setPattern("RANDOM");
                config.setMinValue(0.0);
                config.setMaxValue(100.0);
                config.setStartValue(50.0);
                config.setStepValue(1.0);
                config.setPublishIntervalMs(5000);
                simConfigRepository.save(config);

                return ResponseEntity.ok(Map.of("message", "Datapoint created successfully in Zoho IoT", "parsingKey", pKey));
            } catch (Exception e) {
                log.error("Failed to create datapoint in Zoho", e);
                return ResponseEntity.status(HttpStatus.BAD_GATEWAY).body(Map.of("error", e.getMessage()));
            }
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{dpId}")
    public ResponseEntity<?> deleteDatapoint(@PathVariable UUID deviceId,
                                              @PathVariable String dpId,
                                              @AuthenticationPrincipal UserEntity user) {
        return deviceRepository.findByIdAndUser(deviceId, user).map(device -> {
            try {
                String token = oauthService.getValidAccessToken(user);
                String url = zohoApiConfig.getIotBaseUrl(user.getRegion()) + "/iot/v1/datapointdefinitions?ids=" + dpId;

                HttpHeaders headers = new HttpHeaders();
                headers.set("Authorization", "Zoho-oauthtoken " + token);
                restTemplate.exchange(url, HttpMethod.DELETE, new HttpEntity<>(headers), String.class);

                return ResponseEntity.ok(Map.of("message", "Datapoint deleted"));
            } catch (Exception e) {
                log.error("Failed to delete datapoint in Zoho", e);
                return ResponseEntity.status(HttpStatus.BAD_GATEWAY).body(Map.of("error", e.getMessage()));
            }
        }).orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/{parsingKey}/config")
    public ResponseEntity<?> getConfig(@PathVariable UUID deviceId,
                                        @PathVariable String parsingKey,
                                        @AuthenticationPrincipal UserEntity user) {
        return deviceRepository.findByIdAndUser(deviceId, user).map(device ->
            simConfigRepository.findByDeviceIdAndParsingKey(deviceId, parsingKey)
                .map(cfg -> ResponseEntity.ok((Object) cfg))
                .orElseGet(() -> ResponseEntity.notFound().build())
        ).orElseGet(() -> ResponseEntity.notFound().build());
    }

    @PutMapping("/{parsingKey}/config")
    public ResponseEntity<?> updateConfig(@PathVariable UUID deviceId,
                                           @PathVariable String parsingKey,
                                           @Valid @RequestBody SimulationConfigRequest request,
                                           @AuthenticationPrincipal UserEntity user) {
        return deviceRepository.findByIdAndUser(deviceId, user).map(device -> {
            SimulationConfigEntity cfg = simConfigRepository.findByDeviceIdAndParsingKey(deviceId, parsingKey)
                    .orElse(new SimulationConfigEntity());
            
            cfg.setDeviceId(deviceId);
            cfg.setParsingKey(parsingKey);
            cfg.setPattern(request.pattern());
            cfg.setMinValue(request.minValue());
            cfg.setMaxValue(request.maxValue());
            cfg.setStartValue(request.startValue());
            cfg.setStepValue(request.stepValue());
            cfg.setPublishIntervalMs(request.publishIntervalMs());
            
            simConfigRepository.save(cfg);

            // Notify the running simulator to apply the new config immediately
            simulationManagerService.updateSimulatorConfig(deviceId, cfg);

            return ResponseEntity.ok(cfg);
        }).orElseGet(() -> ResponseEntity.notFound().build());
    }

    public record SimulationConfigRequest(
            @NotBlank(message = "Pattern cannot be blank")
            String pattern,
            @NotNull
            Double minValue,
            @NotNull
            Double maxValue,
            @NotNull
            Double startValue,
            @NotNull
            @Min(value = 0, message = "Step value must be non-negative")
            Double stepValue,
            @NotNull
            @Min(value = 500, message = "Publish interval must be at least 500ms")
            Integer publishIntervalMs
    ) {}

    public record DatapointCreateRequest(
            @NotBlank(message = "Name cannot be blank")
            String name,
            String dataType,
            String unit,
            String parsingKey
    ) {}
}
