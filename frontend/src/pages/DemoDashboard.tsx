import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Play, Square, Activity, Trash2 } from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts';
import { format } from 'date-fns';
import { useWebSocket } from '../context/WebSocketContext';
import axios from 'axios';

const CHART_COLORS = [
  '#1976d2', '#2e7d32', '#f57c00', '#d32f2f',
  '#7b1fa2', '#0288d1', '#c2185b', '#00838f',
];

const MAX_POINTS = 100;

const ALL_PATTERNS = [
  'RANDOM', 'INCREMENTAL', 'DECREMENTAL',
  'DAILY_SINUSOIDAL', 'WEEKLY_SINUSOIDAL', 'GAUSSIAN_NOISE',
  'ANOMALY_SPIKE', 'LINEAR_DRIFT', 'EXPONENTIAL_DECAY',
  'RANDOM_WALK', 'MISSING_DATA', 'STEP_FUNCTION',
  'SAWTOOTH', 'BURST_EVENT', 'PLATEAU_SHIFT',
  'SEASONAL_COMPOSITE', 'CORRELATED',
];

// Patterns that use start value
const USES_START = new Set([
  'INCREMENTAL', 'DECREMENTAL', 'LINEAR_DRIFT', 'EXPONENTIAL_DECAY',
  'RANDOM_WALK', 'STEP_FUNCTION', 'SAWTOOTH', 'CORRELATED',
]);

// Patterns that use step value
const USES_STEP = new Set([
  'INCREMENTAL', 'DECREMENTAL', 'LINEAR_DRIFT', 'EXPONENTIAL_DECAY',
  'RANDOM_WALK', 'STEP_FUNCTION', 'SAWTOOTH',
]);

// Patterns that use min/max range
const USES_RANGE = new Set([
  'RANDOM', 'DAILY_SINUSOIDAL', 'WEEKLY_SINUSOIDAL', 'GAUSSIAN_NOISE',
  'ANOMALY_SPIKE', 'RANDOM_WALK', 'MISSING_DATA', 'STEP_FUNCTION',
  'SAWTOOTH', 'BURST_EVENT', 'PLATEAU_SHIFT', 'SEASONAL_COMPOSITE',
  'CORRELATED',
]);

function getDatapointSummary(dp: DemoDatapoint): string {
  const p = dp.pattern;
  switch (p) {
    case 'RANDOM':              return `Range: ${dp.min} to ${dp.max}`;
    case 'INCREMENTAL':         return `Start: ${dp.start}, Step: +${dp.step}, Max: ${dp.max}`;
    case 'DECREMENTAL':         return `Start: ${dp.start}, Step: -${dp.step}, Min: ${dp.min}`;
    case 'DAILY_SINUSOIDAL':    return `Sine [${dp.min}, ${dp.max}] 24h period`;
    case 'WEEKLY_SINUSOIDAL':   return `Sine [${dp.min}, ${dp.max}] 7d period`;
    case 'GAUSSIAN_NOISE':      return `Gaussian [${dp.min}, ${dp.max}]`;
    case 'ANOMALY_SPIKE':       return `Range: ${dp.min}-${dp.max}, 2% spike`;
    case 'LINEAR_DRIFT':        return `Start: ${dp.start}, Drift: +${dp.step}/tick`;
    case 'EXPONENTIAL_DECAY':   return `Start: ${dp.start}, Decay: ${dp.step}%`;
    case 'RANDOM_WALK':         return `Walk ±${dp.step} in [${dp.min}, ${dp.max}]`;
    case 'MISSING_DATA':        return `Range: ${dp.min}-${dp.max}, 10% gaps`;
    case 'STEP_FUNCTION':       return `Stairs from ${dp.start}, +${dp.step}`;
    case 'SAWTOOTH':            return `Ramp ${dp.min}→${dp.max}, step=${dp.step}`;
    case 'BURST_EVENT':         return `Base: ${dp.min}, Burst→${dp.max}`;
    case 'PLATEAU_SHIFT':       return `Plateaus in [${dp.min}, ${dp.max}]`;
    case 'SEASONAL_COMPOSITE':  return `Composite [${dp.min}, ${dp.max}]`;
    case 'CORRELATED':          return `Correlated [${dp.min}, ${dp.max}]`;
    default:                    return `${p}`;
  }
}

interface DemoDatapoint {
  id: string;
  name: string;
  parsingKey: string;
  min: number;
  max: number;
  start: number;
  step: number;
  intervalMs: number;
  pattern: string;
}

const DemoDashboard: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { subscribe } = useWebSocket();

  const demoConfig = location.state?.demoConfig;

  const [datapoints, setDatapoints] = useState<DemoDatapoint[]>([]);
  const [activeDeviceId, setActiveDeviceId] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  // Form State
  const [dpName, setDpName] = useState('');
  const [dpKey, setDpKey] = useState('');
  const [dpPattern, setDpPattern] = useState('RANDOM');
  const [dpMin, setDpMin] = useState(0);
  const [dpMax, setDpMax] = useState(100);
  const [dpStart, setDpStart] = useState(0);
  const [dpStep, setDpStep] = useState(1);

  // Graph State
  const historyRef = useRef<any[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);

  useEffect(() => {
    if (!demoConfig) {
      navigate('/login');
    }
  }, [demoConfig, navigate]);

  useEffect(() => {
    if (!activeDeviceId) return;

    const unsub = subscribe(activeDeviceId, (msg) => {
      const point: any = { time: format(new Date(msg.timestamp), 'HH:mm:ss') };
      Object.entries(msg.values).forEach(([k, v]) => { point[k] = v; });

      const newHistory = [...historyRef.current, point];
      if (newHistory.length > MAX_POINTS) newHistory.shift();
      historyRef.current = newHistory;
      setChartData([...newHistory]);
    });

    return () => unsub();
  }, [activeDeviceId, subscribe]);

  const handleAddDatapoint = () => {
    if (!dpName || !dpKey) return;
    const newDp: DemoDatapoint = {
      id: Date.now().toString(),
      name: dpName,
      parsingKey: dpKey,
      min: dpMin,
      max: dpMax,
      start: dpStart,
      step: dpStep,
      intervalMs: 5000,
      pattern: dpPattern
    };
    setDatapoints([...datapoints, newDp]);
    setDpName('');
    setDpKey('');
  };

  const handleRemoveDatapoint = (id: string) => {
    setDatapoints(datapoints.filter(d => d.id !== id));
  };

  const handleStartSimulation = async () => {
    if (datapoints.length === 0) {
      alert("Please add at least one datapoint.");
      return;
    }
    
    try {
      const payload = {
        ...demoConfig,
        datapoints: datapoints.map(d => ({
          name: d.name,
          parsingKey: d.parsingKey,
          min: d.min,
          max: d.max,
          start: d.start,
          step: d.step,
          intervalMs: d.intervalMs,
          pattern: d.pattern
        }))
      };

      const res = await axios.post('/api/demo/simulate/start', payload);
      setActiveDeviceId(res.data.deviceId);
      setIsRunning(true);
      historyRef.current = [];
      setChartData([]);
    } catch (e: any) {
      console.error(e);
      alert(e.response?.data?.message || 'Failed to start simulation');
    }
  };

  const handleStopSimulation = async () => {
    if (!activeDeviceId) return;
    try {
      await axios.post(`/api/demo/simulate/${activeDeviceId}/stop`);
      setIsRunning(false);
      setActiveDeviceId(null);
    } catch (e) {
      console.error(e);
      alert('Failed to stop simulation');
    }
  };

  if (!demoConfig) return null;

  const showRange = USES_RANGE.has(dpPattern);
  const showStart = USES_START.has(dpPattern);
  const showStep  = USES_STEP.has(dpPattern);

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f9fafb', display: 'flex', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      
      {/* Sidebar */}
      <div style={{ width: '320px', backgroundColor: '#fff', borderRight: '1px solid #e5e7eb', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '16px', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button 
            onClick={() => navigate('/login')} 
            style={{ padding: '8px', border: 'none', background: 'transparent', cursor: 'pointer', borderRadius: '8px' }}
            onMouseOver={e => e.currentTarget.style.backgroundColor = '#f3f4f6'}
            onMouseOut={e => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            <ArrowLeft color="#6b7280" size={20} />
          </button>
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#111827', margin: 0 }}>Demo Setup</h2>
            <p style={{ fontSize: '12px', color: '#6b7280', margin: 0 }}>No database required</p>
          </div>
        </div>

        <div style={{ padding: '16px', flex: 1, overflowY: 'auto' }}>
          <div style={{ marginBottom: '24px', padding: '12px', backgroundColor: '#eff6ff', borderRadius: '8px', border: '1px solid #dbeafe' }}>
            <h3 style={{ fontSize: '12px', fontWeight: 600, color: '#1e40af', textTransform: 'uppercase', marginBottom: '8px', margin: 0 }}>MQTT Connection</h3>
            <div style={{ fontSize: '14px', color: '#1e3a8a', lineHeight: 1.5 }}>
              <p style={{ margin: '4px 0' }}><strong>Broker:</strong> {demoConfig.brokerUrl}:{demoConfig.brokerPort}</p>
              <p style={{ margin: '4px 0', wordBreak: 'break-all' }}><strong>Client ID:</strong> {demoConfig.clientId}</p>
              <p style={{ margin: '4px 0', wordBreak: 'break-all' }}><strong>Topic:</strong> {demoConfig.publishTopic || `devices/${demoConfig.clientId}/telemetry`}</p>
            </div>
          </div>

          <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px', margin: 0 }}>Custom Datapoints</h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px', marginTop: '12px' }}>
            {datapoints.map((dp) => (
              <div key={dp.id} style={{ padding: '12px', backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <p style={{ fontSize: '14px', fontWeight: 500, color: '#111827', margin: 0 }}>{dp.name}</p>
                  <p style={{ fontSize: '12px', color: '#6b7280', fontFamily: 'monospace', margin: '4px 0' }}>Key: {dp.parsingKey} | Type: {dp.pattern.replace(/_/g, ' ')}</p>
                  <p style={{ fontSize: '12px', color: '#9ca3af', margin: 0 }}>
                    {getDatapointSummary(dp)}
                  </p>
                </div>
                <button 
                  onClick={() => handleRemoveDatapoint(dp.id)}
                  disabled={isRunning}
                  style={{ border: 'none', background: 'transparent', cursor: isRunning ? 'not-allowed' : 'pointer', color: '#9ca3af', padding: '4px' }}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
            {datapoints.length === 0 && (
              <p style={{ fontSize: '14px', color: '#6b7280', textAlign: 'center', padding: '16px 0', fontStyle: 'italic', margin: 0 }}>No datapoints added.</p>
            )}
          </div>

          {!isRunning && (
            <div style={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '16px', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' }}>
              <h4 style={{ fontSize: '14px', fontWeight: 500, color: '#111827', marginBottom: '12px', margin: 0 }}>Add Datapoint</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: '#374151', marginBottom: '4px' }}>Display Name</label>
                  <input type="text" value={dpName} onChange={e => setDpName(e.target.value)} style={{ width: '100%', padding: '8px', fontSize: '14px', border: '1px solid #d1d5db', borderRadius: '6px', boxSizing: 'border-box' }} placeholder="e.g. Battery Level" />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: '#374151', marginBottom: '4px' }}>JSON Parsing Key</label>
                  <input type="text" value={dpKey} onChange={e => setDpKey(e.target.value)} style={{ width: '100%', padding: '8px', fontSize: '14px', border: '1px solid #d1d5db', borderRadius: '6px', boxSizing: 'border-box' }} placeholder="e.g. battery_level" />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: '#374151', marginBottom: '4px' }}>Pattern Type</label>
                  <select value={dpPattern} onChange={e => setDpPattern(e.target.value)} style={{ width: '100%', padding: '8px', fontSize: '14px', border: '1px solid #d1d5db', borderRadius: '6px', boxSizing: 'border-box' }}>
                    {ALL_PATTERNS.map(p => (
                      <option key={p} value={p}>{p.replace(/_/g, ' ')}</option>
                    ))}
                  </select>
                </div>
                
                {showRange && (
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: '#374151', marginBottom: '4px' }}>Min</label>
                      <input type="number" value={dpMin} onChange={e => setDpMin(Number(e.target.value))} style={{ width: '100%', padding: '8px', fontSize: '14px', border: '1px solid #d1d5db', borderRadius: '6px', boxSizing: 'border-box' }} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: '#374151', marginBottom: '4px' }}>Max</label>
                      <input type="number" value={dpMax} onChange={e => setDpMax(Number(e.target.value))} style={{ width: '100%', padding: '8px', fontSize: '14px', border: '1px solid #d1d5db', borderRadius: '6px', boxSizing: 'border-box' }} />
                    </div>
                  </div>
                )}

                {showStart && (
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: '#374151', marginBottom: '4px' }}>Start Value</label>
                      <input type="number" value={dpStart} onChange={e => setDpStart(Number(e.target.value))} style={{ width: '100%', padding: '8px', fontSize: '14px', border: '1px solid #d1d5db', borderRadius: '6px', boxSizing: 'border-box' }} />
                    </div>
                    {showStep && (
                      <div style={{ flex: 1 }}>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: '#374151', marginBottom: '4px' }}>{dpPattern === 'EXPONENTIAL_DECAY' ? 'Decay %' : 'Step'}</label>
                        <input type="number" value={dpStep} onChange={e => setDpStep(Number(e.target.value))} style={{ width: '100%', padding: '8px', fontSize: '14px', border: '1px solid #d1d5db', borderRadius: '6px', boxSizing: 'border-box' }} />
                      </div>
                    )}
                  </div>
                )}

                {!showRange && !showStart && (
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: '#374151', marginBottom: '4px' }}>Min</label>
                      <input type="number" value={dpMin} onChange={e => setDpMin(Number(e.target.value))} style={{ width: '100%', padding: '8px', fontSize: '14px', border: '1px solid #d1d5db', borderRadius: '6px', boxSizing: 'border-box' }} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: '#374151', marginBottom: '4px' }}>Max</label>
                      <input type="number" value={dpMax} onChange={e => setDpMax(Number(e.target.value))} style={{ width: '100%', padding: '8px', fontSize: '14px', border: '1px solid #d1d5db', borderRadius: '6px', boxSizing: 'border-box' }} />
                    </div>
                  </div>
                )}

                {/* For INCREMENTAL/DECREMENTAL with range bound */}
                {(dpPattern === 'INCREMENTAL' || dpPattern === 'DECREMENTAL') && (
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: '#374151', marginBottom: '4px' }}>{dpPattern === 'INCREMENTAL' ? 'Max Bound' : 'Min Bound'}</label>
                      <input type="number" value={dpPattern === 'INCREMENTAL' ? dpMax : dpMin} onChange={e => dpPattern === 'INCREMENTAL' ? setDpMax(Number(e.target.value)) : setDpMin(Number(e.target.value))} style={{ width: '100%', padding: '8px', fontSize: '14px', border: '1px solid #d1d5db', borderRadius: '6px', boxSizing: 'border-box' }} />
                    </div>
                  </div>
                )}

                <button 
                  onClick={handleAddDatapoint}
                  disabled={!dpName || !dpKey}
                  style={{ width: '100%', marginTop: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px', backgroundColor: '#fff', fontSize: '14px', fontWeight: 500, color: '#374151', cursor: (!dpName || !dpKey) ? 'not-allowed' : 'pointer', opacity: (!dpName || !dpKey) ? 0.5 : 1 }}
                >
                  <Plus size={16} /> Add
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main Content - Live Graph */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, backgroundColor: '#fff' }}>
        <div style={{ height: '64px', padding: '0 24px', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Activity color="#9ca3af" size={20} />
            <h1 style={{ fontSize: '20px', fontWeight: 600, color: '#111827', margin: 0 }}>Live Simulator</h1>
          </div>
          <div>
            {isRunning ? (
              <button
                onClick={handleStopSimulation}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '8px 16px', border: 'none', borderRadius: '6px', backgroundColor: '#dc2626', color: '#fff', fontSize: '14px', fontWeight: 500, cursor: 'pointer' }}
              >
                <Square size={16} /> Stop Simulator
              </button>
            ) : (
              <button
                onClick={handleStartSimulation}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '8px 16px', border: 'none', borderRadius: '6px', backgroundColor: '#2563eb', color: '#fff', fontSize: '14px', fontWeight: 500, cursor: 'pointer' }}
              >
                <Play size={16} /> Start Simulator
              </button>
            )}
          </div>
        </div>

        <div style={{ flex: 1, padding: '24px', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <div style={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px', flex: 1, padding: '24px', display: 'flex', flexDirection: 'column' }}>
            {chartData.length === 0 ? (
              <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#9ca3af' }}>
                <Activity size={48} style={{ opacity: 0.2, marginBottom: '16px' }} />
                <p style={{ margin: 0 }}>No telemetry data available.</p>
                <p style={{ fontSize: '14px', marginTop: '4px', margin: 0 }}>Add datapoints and click Start Simulator to begin.</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                  <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} minTickGap={30} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', border: 'none', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                    itemStyle={{ fontSize: '13px' }}
                    labelStyle={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}
                  />
                  <Legend wrapperStyle={{ paddingTop: '20px' }} />
                  {datapoints.map((dp, i) => (
                    <Line
                      key={dp.parsingKey}
                      type="monotone"
                      dataKey={dp.parsingKey}
                      name={dp.name}
                      stroke={CHART_COLORS[i % CHART_COLORS.length]}
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 6, strokeWidth: 0 }}
                      isAnimationActive={false}
                      connectNulls={false}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DemoDashboard;
