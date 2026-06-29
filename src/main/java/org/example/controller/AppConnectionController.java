package org.example.controller;

import org.example.entity.AppConnectionEntity;
import org.example.entity.UserEntity;
import org.example.zoho.AppConnectionService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * REST API for managing Zoho IoT Application connections.
 *
 * A developer account may have multiple Sandbox applications. This controller
 * lets the authenticated user save, switch and remove application connections.
 *
 * All IoT API calls (models, devices, datapoints) are scoped to the active connection's domain.
 */
@RestController
@RequestMapping("/api/connections")
public class AppConnectionController {

    private final AppConnectionService appConnectionService;

    public AppConnectionController(AppConnectionService appConnectionService) {
        this.appConnectionService = appConnectionService;
    }

    /** Discover Sandbox applications from Zoho and save them without manual domain entry */
    @PostMapping("/discover")
    public ResponseEntity<?> discover(@AuthenticationPrincipal UserEntity user) {
        try {
            List<Map<String, Object>> result = appConnectionService.discoverAndSaveConnections(user)
                    .stream()
                    .map(appConnectionService::toMap)
                    .toList();
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    /** List all saved app connections for the current user */
    @GetMapping
    public ResponseEntity<List<Map<String, Object>>> list(@AuthenticationPrincipal UserEntity user) {
        List<Map<String, Object>> result = appConnectionService.listConnections(user)
                .stream()
                .map(appConnectionService::toMap)
                .toList();
        return ResponseEntity.ok(result);
    }

    /** Add a sandbox domain once, validate it with the current user's Zoho token, then save it */
    @PostMapping
    public ResponseEntity<?> add(@RequestBody Map<String, String> payload,
                                  @AuthenticationPrincipal UserEntity user) {
        try {
            String appDomain = payload.get("appDomain");
            String appName = payload.get("appName");
            AppConnectionEntity conn = appConnectionService.addValidatedConnection(user, appDomain, appName);
            return ResponseEntity.ok(appConnectionService.toMap(conn));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    /** Switch the active sandbox application */
    @PutMapping("/{id}/activate")
    public ResponseEntity<?> activate(@PathVariable UUID id,
                                       @AuthenticationPrincipal UserEntity user) {
        try {
            AppConnectionEntity conn = appConnectionService.activateConnection(user, id);
            return ResponseEntity.ok(appConnectionService.toMap(conn));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    /** Remove a saved application connection */
    @DeleteMapping("/{id}")
    public ResponseEntity<?> remove(@PathVariable UUID id,
                                     @AuthenticationPrincipal UserEntity user) {
        try {
            appConnectionService.removeConnection(user, id);
            return ResponseEntity.ok(Map.of("status", "removed"));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
}
