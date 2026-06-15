import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_BASE_URL !== undefined 
  ? import.meta.env.VITE_API_BASE_URL 
  : 'http://localhost:8080';

export const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: true, // Send session cookies
});

// ─── Auth ──────────────────────────────────────────────────────────────────
export const getLoginUrl   = (region = 'in') => api.get(`/oauth/login?region=${region}`);
export const getCurrentUser = ()              => api.get('/oauth/me');
export const logout         = ()              => api.post('/oauth/logout');

// ─── Devices ───────────────────────────────────────────────────────────────
export const getDevices      = ()                 => api.get('/api/devices');
export const getDevice       = (id: string)       => api.get(`/api/devices/${id}`);
export const deleteDevice    = (id: string)       => api.delete(`/api/devices/${id}`);
export const syncDevices     = ()                 => api.post('/api/devices/sync');
export const getDeviceStats  = ()                 => api.get('/api/devices/stats');

// ─── Simulation ────────────────────────────────────────────────────────────
export const startSimulation  = (id: string) => api.post(`/api/devices/${id}/start`);
export const stopSimulation   = (id: string) => api.post(`/api/devices/${id}/stop`);
export const pauseSimulation  = (id: string) => api.post(`/api/devices/${id}/pause`);
export const resumeSimulation = (id: string) => api.post(`/api/devices/${id}/resume`);

// ─── Datapoints ────────────────────────────────────────────────────────────
export const getDatapoints   = (deviceId: string) => api.get(`/api/devices/${deviceId}/datapoints`);
export const syncDatapoints  = (deviceId: string) => api.post(`/api/devices/${deviceId}/datapoints/sync`);
export const getSimConfig    = (deviceId: string, dpId: string) =>
  api.get(`/api/devices/${deviceId}/datapoints/${dpId}/config`);
export const updateSimConfig = (deviceId: string, dpId: string, config: any) =>
  api.put(`/api/devices/${deviceId}/datapoints/${dpId}/config`, config);

// ─── Telemetry ─────────────────────────────────────────────────────────────
export const getTelemetryHistory = (deviceId: string) =>
  api.get(`/api/devices/${deviceId}/telemetry/history`);
export const getLiveTelemetry = (deviceId: string) =>
  api.get(`/api/devices/${deviceId}/telemetry/live`);
