import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts';
import { useWebSocket } from '../context/WebSocketContext';
import { getDevice, getDatapoints, getTelemetryHistory } from '../api';
import { format } from 'date-fns';

const CHART_COLORS = [
  '#1976d2', '#2e7d32', '#f57c00', '#d32f2f',
  '#7b1fa2', '#0288d1', '#c2185b', '#00838f',
];

const MAX_POINTS = 100;

const LiveGraph: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate  = useNavigate();
  const { subscribe, isConnected } = useWebSocket();

  const [device, setDevice]         = useState<any>(null);
  const [datapoints, setDatapoints] = useState<{name: string, key: string}[]>([]);
  const historyRef = useRef<any[]>([]);
  const [chartData, setChartData]   = useState<any[]>([]);
  const [loading, setLoading]       = useState(true);

  useEffect(() => {
    if (!id) return;
    Promise.all([getDevice(id), getDatapoints(id), getTelemetryHistory(id)])
      .then(([devRes, dpRes, histRes]) => {
        setDevice(devRes.data);
        const dps = dpRes.data.map((d: any) => ({
          name: d.name,
          key: d.simulationConfig?.parsingKey || d.parsingKey || d.name
        }));
        setDatapoints(dps);

        const rows = histRes.data as any[];
        const byTime: Record<string, any> = {};
        rows.slice().reverse().forEach((r: any) => {
          const t = format(new Date(r.recordedAt), 'HH:mm:ss');
          if (!byTime[t]) byTime[t] = { time: t };
          byTime[t][r.datapointName] = r.value;
        });
        const seeded = Object.values(byTime).slice(-MAX_POINTS);
        historyRef.current = seeded;
        setChartData([...seeded]);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!id) return;
    const unsub = subscribe(id, (msg) => {
      const point: any = { time: format(new Date(msg.timestamp), 'HH:mm:ss') };
      Object.entries(msg.values).forEach(([k, v]) => { point[k] = v; });

      historyRef.current = [...historyRef.current, point].slice(-MAX_POINTS);
      setChartData([...historyRef.current]);
    });
    return unsub;
  }, [id, subscribe, datapoints]);

  if (loading) return (
    <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)' }}>Loading graph…</div>
  );

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="btn btn-ghost" onClick={() => navigate(`/devices/${id}`)} style={{ padding: '4px 8px' }}>
            <ArrowLeft size={14} />
          </button>
          <div>
            <h1 className="page-title">Live Telemetry — {device?.name}</h1>
            <p className="page-subtitle">Real-time sensor data · last {MAX_POINTS} points</p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
          <span className={`conn-dot ${isConnected ? 'conn-dot-connected' : 'conn-dot-disconnected'}`} />
          <span style={{ color: isConnected ? 'var(--accent-green)' : 'var(--text-muted)' }}>
            {isConnected ? 'Live' : 'Disconnected'}
          </span>
        </div>
      </div>

      {datapoints.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 48 }}>
          <p style={{ color: 'var(--text-muted)' }}>No datapoints configured. Sync and configure datapoints first.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Combined chart */}
          <div className="card">
            <h2 style={{ fontWeight: 600, fontSize: 15, marginBottom: 16 }}>All Sensors</h2>
            <ResponsiveContainer width="100%" height={320}>
              <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="time"
                  tick={{ fill: '#9aa0a6', fontSize: 11 }}
                  tickLine={false}
                  axisLine={{ stroke: '#e5e7eb' }}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tick={{ fill: '#9aa0a6', fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  width={40}
                />
                <Tooltip
                  contentStyle={{
                    background: '#fff',
                    border: '1px solid #e5e7eb',
                    borderRadius: 8,
                    fontSize: 12,
                    boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                  }}
                  labelStyle={{ color: '#5f6368', marginBottom: 4 }}
                  itemStyle={{ color: '#1a1a1a' }}
                />
                <Legend wrapperStyle={{ fontSize: 12, paddingTop: 12 }} />
                {datapoints.map((dp, i) => (
                  <Line
                    key={dp.key}
                    name={dp.name}
                    type="monotone"
                    dataKey={dp.key}
                    stroke={CHART_COLORS[i % CHART_COLORS.length]}
                    dot={{ r: 2, strokeWidth: 1 }}
                    activeDot={{ r: 5 }}
                    strokeWidth={2}
                    isAnimationActive={false}
                    connectNulls
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Individual charts */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: 16 }}>
            {datapoints.map((dp, i) => {
              const latest = chartData[chartData.length - 1]?.[dp.key];
              return (
                <div key={dp.key} className="card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <h3 style={{ fontSize: 14, fontWeight: 600, color: CHART_COLORS[i % CHART_COLORS.length] }}>
                      {dp.name}
                    </h3>
                    <span style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)' }}>
                      {latest !== undefined ? latest.toFixed(2) : '—'}
                    </span>
                  </div>
                  <ResponsiveContainer width="100%" height={120}>
                    <LineChart data={chartData} margin={{ top: 2, right: 8, bottom: 2, left: -20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="time" hide />
                      <YAxis tick={{ fill: '#9aa0a6', fontSize: 10 }} tickLine={false} axisLine={false} width={40} />
                      <Tooltip
                        contentStyle={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 6, fontSize: 11, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}
                        labelStyle={{ color: '#5f6368' }}
                      />
                      <Line
                        name={dp.name}
                        type="monotone"
                        dataKey={dp.key}
                        stroke={CHART_COLORS[i % CHART_COLORS.length]}
                        dot={{ r: 1.5, strokeWidth: 1 }}
                        activeDot={{ r: 4 }}
                        strokeWidth={2}
                        isAnimationActive={false}
                        connectNulls
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              );
            })}
          </div>

          {/* Current values */}
          {chartData.length > 0 && (
            <div className="card">
              <h2 style={{ fontWeight: 600, fontSize: 15, marginBottom: 14 }}>Current Values</h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 12 }}>
                {datapoints.map((dp, i) => {
                  const val = chartData[chartData.length - 1]?.[dp.key];
                  return (
                    <div key={dp.key} style={{
                      padding: '12px 16px',
                      background: 'var(--bg-elevated)',
                      borderRadius: 8,
                      border: '1px solid var(--border-subtle)',
                    }}>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>{dp.name}</div>
                      <div style={{ fontSize: 22, fontWeight: 700, color: CHART_COLORS[i % CHART_COLORS.length] }}>
                        {val !== undefined ? val.toFixed(2) : '—'}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default LiveGraph;
