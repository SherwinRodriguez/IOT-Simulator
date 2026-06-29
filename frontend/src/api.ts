import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_BASE_URL !== undefined 
  ? import.meta.env.VITE_API_BASE_URL 
  : 'http://localhost:8080';

export const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: true, // Send session cookies
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && (error.response.status === 401 || error.response.status === 403)) {
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// ─── Auth ──────────────────────────────────────────────────────────────────
export const getLoginUrl    = (region = 'in') => api.get(`/oauth/login?region=${region}`);
export const getCurrentUser = () => api.get('/oauth/me');
export const logout         = () => api.post('/oauth/logout');
export const startDemoMode  = (config: any) => api.post('/api/auth/demo', config);

// ─── App Connections ───────────────────────────────────────────────────────
export const getConnections    = ()                                       => api.get('/api/connections');
export const discoverConnections = ()                                     => api.post('/api/connections/discover');
export const addConnection     = (data: { appDomain: string; appName?: string }) => api.post('/api/connections', data);
export const activateConnection= (id: string)                             => api.put(`/api/connections/${id}/activate`);
export const removeConnection  = (id: string)                             => api.delete(`/api/connections/${id}`);

// ─── Devices ───────────────────────────────────────────────────────────────
export const getDevices      = ()                 => api.get('/api/devices');
export const getModels       = ()                 => api.get('/api/devices/models');
export const getDevice       = (id: string)       => api.get(`/api/devices/${id}`);
export const createDevice    = (data: { name: string, description?: string, model_id?: string }) => api.post('/api/devices', data);
export const deleteDevice    = (id: string)       => api.delete(`/api/devices/${id}`);
export const syncDevices     = ()                 => api.post('/api/devices/sync');
export const registerDevice  = (id: string)       => api.post(`/api/devices/${id}/register`);
export const getDeviceStats  = ()                 => api.get('/api/devices/stats');

// ─── Simulation ────────────────────────────────────────────────────────────
export const startSimulation  = (id: string) => api.post(`/api/devices/${id}/start`);
export const stopSimulation   = (id: string) => api.post(`/api/devices/${id}/stop`);
export const pauseSimulation  = (id: string) => api.post(`/api/devices/${id}/pause`);
export const resumeSimulation = (id: string) => api.post(`/api/devices/${id}/resume`);

// ─── Datapoints ────────────────────────────────────────────────────────────
export const getDatapoints   = (deviceId: string) => api.get(`/api/devices/${deviceId}/datapoints`);
export const syncDatapoints  = (deviceId: string) => api.post(`/api/devices/${deviceId}/datapoints/sync`);
export const addDatapoint    = (deviceId: string, data: { name: string, dataType?: string, unit?: string }) => 
  api.post(`/api/devices/${deviceId}/datapoints`, data);
export const deleteDatapoint = (deviceId: string, dpId: string) => 
  api.delete(`/api/devices/${deviceId}/datapoints/${dpId}`);
export const getSimConfig    = (deviceId: string, dpId: string) =>
  api.get(`/api/devices/${deviceId}/datapoints/${dpId}/config`);
export const updateSimConfig = (deviceId: string, dpId: string, config: any) =>
  api.put(`/api/devices/${deviceId}/datapoints/${dpId}/config`, config);

// ─── Telemetry ─────────────────────────────────────────────────────────────
export const getTelemetryHistory = (deviceId: string) =>
  api.get(`/api/devices/${deviceId}/telemetry/history`);
export const getLiveTelemetry = (deviceId: string) =>
  api.get(`/api/devices/${deviceId}/telemetry/live`);
export const getHistoricalTelemetryZoho = (deviceId: string, params: { datapointName: string, period?: string, aggregation?: string, timeGrouping?: string, startTime?: number, endTime?: number }) =>
  api.get(`/api/devices/${deviceId}/telemetry/historical/zoho`, { params });
