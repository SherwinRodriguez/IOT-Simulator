import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Wifi, WifiOff } from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts';
import { useWebSocket } from '../context/WebSocketContext';
import { getDevice, getDatapoints, getTelemetryHistory } from '../api';
import { format } from 'date-fns';

const CHART_COLORS = [
  '#22c55e', '#06b6d4', '#8b5cf6', '#f59e0b',
  '#ef4444', '#ec4899', '#14b8a6', '#f97316',
];

const MAX_POINTS = 100;

const LiveGraph: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate  = useNavigate();
  const { subscribe, isConnected } = useWebSocket();

  const [device, setDevice]         = useState<any>(null);
  const [datapointNames, setDpNames] = useState<string[]>([]);
  // history: { time: string, [dpName]: number }[]
  const historyRef = useRef<any[]>([]);
  const [chartData, setChartData]   = useState<any[]>([]);
  const [loading, setLoading]       = useState(true);

  // Load device + datapoints + seed history
  useEffect(() => {
    if (!id) return;
    Promise.all([getDevice(id), getDatapoints(id), getTelemetryHistory(id)])
      .then(([devRes, dpRes, histRes]) => {
        setDevice(devRes.data);
        const names: string[] = dpRes.data.map((d: any) => d.name);
        setDpNames(names);

        // Seed chart with existing telemetry_cache data
        const rows = histRes.data as any[];
        // Group by timestamp (approximate) — convert array of {datapointName, value, recordedAt}
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

  // Subscribe to WebSocket
  useEffect(() => {
    if (!id) return;
    const unsub = subscribe(id, (msg) => {
      const point: any = { time: format(new Date(msg.timestamp), 'HH:mm:ss') };
      Object.entries(msg.values).forEach(([k, v]) => { point[k] = v; });

      historyRef.current = [...historyRef.current, point].slice(-MAX_POINTS);
      setChartData([...historyRef.current]);
    });
    return unsub;
  }, [id, subscribe]);

  if (loading) return (
    <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)' }}>Loading graph…</div>
  );

  return (
    <div className="fade-in">
      <div className="page-header">
        <button className="btn btn-ghost" style={{ marginBottom: 16 }} onClick={() => navigate(`/devices/${id}`)}>
          <ArrowLeft size={14} /> Back to Device
        </button>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 className="page-title">Live Telemetry — {device?.name}</h1>
            <p className="page-subtitle">Real-time sensor data · last {MAX_POINTS} points per datapoint</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: isConnected ? 'var(--accent-green)' : 'var(--text-muted)' }}>
            {isConnected ? <Wifi size={15} /> : <WifiOff size={15} />}
            {isConnected ? 'Live' : 'Disconnected'}
          </div>
        </div>
      </div>

      {datapointNames.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 48 }}>
          <p style={{ color: 'var(--text-muted)' }}>No datapoints configured. Sync and configure datapoints first.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Combined chart */}
          <div className="card">
            <h2 style={{ fontWeight: 700, fontSize: 16, marginBottom: 20 }}>All Sensors</h2>
            <ResponsiveContainer width="100%" height={320}>
              <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis
                  dataKey="time"
                  tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
                  tickLine={false}
                  axisLine={{ stroke: 'var(--border-subtle)' }}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  width={40}
                />
                <Tooltip
                  contentStyle={{
                    background: 'var(--bg-elevated)',
                    border: '1px solid var(--border-bright)',
                    borderRadius: 10,
                    fontSize: 12,
                  }}
                  labelStyle={{ color: 'var(--text-secondary)', marginBottom: 6 }}
                  itemStyle={{ color: 'var(--text-primary)' }}
                />
                <Legend
                  wrapperStyle={{ fontSize: 12, paddingTop: 12 }}
                />
                {datapointNames.map((name, i) => (
                  <Line
                    key={name}
                    type="monotone"
                    dataKey={name}
                    stroke={CHART_COLORS[i % CHART_COLORS.length]}
                    dot={false}
                    strokeWidth={2}
                    isAnimationActive={false}
                    connectNulls
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Individual charts per datapoint */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))', gap: 20 }}>
            {datapointNames.map((name, i) => {
              const latest = chartData[chartData.length - 1]?.[name];
              return (
                <div key={name} className="card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <h3 style={{ fontFamily: 'monospace', fontSize: 15, fontWeight: 700, color: CHART_COLORS[i % CHART_COLORS.length] }}>
                      {name}
                    </h3>
                    <span style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)' }}>
                      {latest !== undefined ? latest.toFixed(2) : '—'}
                    </span>
                  </div>
                  <ResponsiveContainer width="100%" height={140}>
                    <LineChart data={chartData} margin={{ top: 2, right: 8, bottom: 2, left: -20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                      <XAxis dataKey="time" hide />
                      <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 10 }} tickLine={false} axisLine={false} width={40} />
                      <Tooltip
                        contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-bright)', borderRadius: 8, fontSize: 11 }}
                        labelStyle={{ color: 'var(--text-secondary)' }}
                      />
                      <Line
                        type="monotone"
                        dataKey={name}
                        stroke={CHART_COLORS[i % CHART_COLORS.length]}
                        dot={false}
                        strokeWidth={2}
                        isAnimationActive={false}
                        connectNulls
                        fill={`url(#grad-${i})`}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              );
            })}
          </div>

          {/* Current values table */}
          {chartData.length > 0 && (
            <div className="card">
              <h2 style={{ fontWeight: 700, fontSize: 16, marginBottom: 16 }}>Current Values</h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12 }}>
                {datapointNames.map((name, i) => {
                  const val = chartData[chartData.length - 1]?.[name];
                  return (
                    <div key={name} style={{
                      padding: '14px 16px', background: 'var(--bg-elevated)',
                      borderRadius: 10, border: `1px solid ${CHART_COLORS[i % CHART_COLORS.length]}30`,
                    }}>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6, fontFamily: 'monospace' }}>{name}</div>
                      <div style={{ fontSize: 24, fontWeight: 800, color: CHART_COLORS[i % CHART_COLORS.length] }}>
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
