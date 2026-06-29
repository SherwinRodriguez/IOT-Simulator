package org.example.controller;

import org.example.auth.ZohoOAuthService;
import org.example.config.ZohoApiConfig;
import org.example.entity.UserEntity;
import org.example.repository.DeviceRepository;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/devices/{deviceId}/telemetry/historical")
public class TelemetryHistoryController {

    private final DeviceRepository deviceRepository;
    private final ZohoOAuthService oauthService;
    private final ZohoApiConfig zohoApiConfig;
    private final RestTemplate restTemplate;

    public TelemetryHistoryController(DeviceRepository deviceRepository,
                                      ZohoOAuthService oauthService,
                                      ZohoApiConfig zohoApiConfig) {
        this.deviceRepository = deviceRepository;
        this.oauthService = oauthService;
        this.zohoApiConfig = zohoApiConfig;
        this.restTemplate = new RestTemplate();
    }

    @GetMapping("/zoho")
    public ResponseEntity<?> getHistoricalTelemetryFromZoho(
            @PathVariable UUID deviceId,
            @RequestParam String datapointName,
            @RequestParam(defaultValue = "last15mins") String period,
            @RequestParam(defaultValue = "last_value") String aggregation,
            @RequestParam(required = false) String timeGrouping,
            @RequestParam(required = false) Long startTime,
            @RequestParam(required = false) Long endTime,
            @AuthenticationPrincipal UserEntity user) {

        return deviceRepository.findByIdAndUser(deviceId, user).map(device -> {
            try {
                String accessToken = oauthService.getValidAccessToken(user);
                
                // Base URL: {api-domain}/iot/v1/datapoints/data
                String baseUrl = zohoApiConfig.getIotApiBaseUrl(user) + "/iot/v1/datapoints/data";
                
                if ("custom".equals(period) && startTime != null && endTime != null) {
                    HttpHeaders headers = new HttpHeaders();
                    headers.set("Authorization", "Zoho-oauthtoken " + accessToken);
                    headers.set("Accept", "application/json");
                    headers.set("Content-Type", "application/json");

                    java.util.Map<String, Object> metric = new java.util.HashMap<>();
                    metric.put("datapoint_names", java.util.List.of(datapointName));
                    metric.put("instance_name", device.getName());
                    if (aggregation != null && !aggregation.isBlank() && !"raw".equalsIgnoreCase(aggregation) && !"none".equalsIgnoreCase(aggregation)) {
                        metric.put("aggregation", aggregation);
                    }
                    
                    metric.put("period", "custom_range");
                    
                    // Format timestamps to yyyy-MM-dd'T'HH:mm:ss in GMT/UTC
                    java.time.format.DateTimeFormatter formatter = java.time.format.DateTimeFormatter
                            .ofPattern("yyyy-MM-dd'T'HH:mm:ss")
                            .withZone(java.time.ZoneId.of("UTC"));
                            
                    java.util.Map<String, Object> fromObj = java.util.Map.of("value", formatter.format(java.time.Instant.ofEpochMilli(startTime)));
                    java.util.Map<String, Object> toObj = java.util.Map.of("value", formatter.format(java.time.Instant.ofEpochMilli(endTime)));
                    
                    metric.put("custom_range", java.util.Map.of("from", fromObj, "to", toObj));
                    if (timeGrouping != null && !timeGrouping.isBlank()) {
                        metric.put("time_grouping", timeGrouping);
                    }

                    java.util.Map<String, Object> body = java.util.Map.of("metrics", java.util.List.of(metric));

                    ResponseEntity<String> response = restTemplate.exchange(
                            baseUrl,
                            HttpMethod.POST,
                            new HttpEntity<>(body, headers),
                            String.class
                    );

                    org.slf4j.LoggerFactory.getLogger(TelemetryHistoryController.class)
                            .info("Historical Telemetry POST Response: {}", response.getBody());

                    return ResponseEntity.status(response.getStatusCode())
                            .header(HttpHeaders.CONTENT_TYPE, "application/json")
                            .body(response.getBody());
                } else {
                    UriComponentsBuilder builder = UriComponentsBuilder.fromHttpUrl(baseUrl)
                            .queryParam("datapoint_name", datapointName)
                            .queryParam("source", device.getName());
                            
                    if (aggregation != null && !aggregation.isBlank() && !"raw".equalsIgnoreCase(aggregation) && !"none".equalsIgnoreCase(aggregation)) {
                        builder.queryParam("aggregation", aggregation);
                    }
                            
                    if (!"custom".equals(period)) {
                        builder.queryParam("period", period);
                    }
                    if (timeGrouping != null && !timeGrouping.isBlank()) {
                        builder.queryParam("time_grouping", timeGrouping);
                    }

                    HttpHeaders headers = new HttpHeaders();
                    headers.set("Authorization", "Zoho-oauthtoken " + accessToken);
                    headers.set("Accept", "application/json");

                    ResponseEntity<String> response = restTemplate.exchange(
                            builder.toUriString(), 
                            HttpMethod.GET, 
                            new HttpEntity<>(headers), 
                            String.class
                    );

                    org.slf4j.LoggerFactory.getLogger(TelemetryHistoryController.class)
                            .info("Historical Telemetry GET Response: {}", response.getBody());

                    return ResponseEntity.status(response.getStatusCode())
                            .header(HttpHeaders.CONTENT_TYPE, "application/json")
                            .body(response.getBody());
                }
            } catch (Exception e) {
                org.slf4j.LoggerFactory.getLogger(TelemetryHistoryController.class)
                        .error("Failed to fetch historical telemetry from Zoho", e);
                return ResponseEntity.status(502).body(Map.of("error", e.getMessage()));
            }
        }).orElse(ResponseEntity.notFound().build());
    }
}
