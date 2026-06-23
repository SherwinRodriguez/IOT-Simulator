import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, AlertCircle } from 'lucide-react';
import { getDatapoints, updateSimConfig } from '../api';

const PATTERNS = [
  'RANDOM', 'INCREMENTAL', 'DECREMENTAL',
  'DAILY_SINUSOIDAL', 'WEEKLY_SINUSOIDAL', 'GAUSSIAN_NOISE',
  'ANOMALY_SPIKE', 'LINEAR_DRIFT', 'EXPONENTIAL_DECAY',
  'RANDOM_WALK', 'MISSING_DATA', 'STEP_FUNCTION',
  'SAWTOOTH', 'BURST_EVENT', 'PLATEAU_SHIFT',
  'SEASONAL_COMPOSITE', 'CORRELATED',
];

// Patterns that use startValue
const USES_START = new Set([
  'INCREMENTAL', 'DECREMENTAL', 'LINEAR_DRIFT', 'EXPONENTIAL_DECAY',
  'RANDOM_WALK', 'STEP_FUNCTION', 'SAWTOOTH', 'CORRELATED',
]);

// Patterns that use stepValue
const USES_STEP = new Set([
  'INCREMENTAL', 'DECREMENTAL', 'LINEAR_DRIFT', 'EXPONENTIAL_DECAY',
  'RANDOM_WALK', 'STEP_FUNCTION', 'SAWTOOTH',
]);

function getPreview(cfg: any): string {
  const p = cfg.pattern || 'RANDOM';
  const min = cfg.minValue ?? 0;
  const max = cfg.maxValue ?? 100;
  const start = cfg.startValue ?? 0;
  const step = cfg.stepValue ?? 1;
  switch (p) {
    case 'RANDOM':              return `random(${min}, ${max})`;
    case 'INCREMENTAL':         return `${start} → +${step} → max(${max})`;
    case 'DECREMENTAL':         return `${start} → -${step} → min(${min})`;
    case 'DAILY_SINUSOIDAL':    return `sine wave [${min}, ${max}] period=24h`;
    case 'WEEKLY_SINUSOIDAL':   return `sine wave [${min}, ${max}] period=7d`;
    case 'GAUSSIAN_NOISE':      return `gaussian μ=${((min+max)/2).toFixed(1)} σ=${((max-min)/6).toFixed(1)}`;
    case 'ANOMALY_SPIKE':       return `random(${min}, ${max}) + 2% spike to ${max * 2}`;
    case 'LINEAR_DRIFT':        return `${start} → +${step}/tick (no cap)`;
    case 'EXPONENTIAL_DECAY':   return `${start} → decay ${step}%/tick → floor(${min})`;
    case 'RANDOM_WALK':         return `walk ±${step} from ${start} in [${min}, ${max}]`;
    case 'MISSING_DATA':        return `random(${min}, ${max}) + 10% NaN`;
    case 'STEP_FUNCTION':       return `staircase ${start} → +${step} every 10 ticks`;
    case 'SAWTOOTH':            return `ramp ${min}→${max} step=${step}, reset`;
    case 'BURST_EVENT':         return `baseline(${min}), 5% burst→${max}`;
    case 'PLATEAU_SHIFT':       return `hold random [${min},${max}] for 20-50 ticks`;
    case 'SEASONAL_COMPOSITE':  return `daily+weekly sine + noise [${min}, ${max}]`;
    case 'CORRELATED':          return `0.95×prev + 0.05×rand(${min},${max})`;
    default:                    return p;
  }
}

const SimulatorConfig: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [datapoints, setDatapoints] = useState<any[]>([]);
  const [configs, setConfigs]       = useState<Record<string, any>>({});
  const [loading, setLoading]       = useState(true);
  const [saving, setSaving]         = useState<string | null>(null);
  const [saved, setSaved]           = useState<string | null>(null);
  const [error, setError]           = useState('');

  useEffect(() => {
    if (!id) return;
    getDatapoints(id).then(res => {
      setDatapoints(res.data);
      const initial: Record<string, any> = {};
      res.data.forEach((dp: any) => {
        if (dp.simulationConfig) {
          initial[dp.id] = { ...dp.simulationConfig };
        } else {
          initial[dp.id] = {
            pattern: 'RANDOM', minValue: 0, maxValue: 100,
            startValue: 0, stepValue: 1, publishIntervalMs: 5000,
          };
        }
      });
      setConfigs(initial);
    }).catch(() => setError('Failed to load datapoints'))
      .finally(() => setLoading(false));
  }, [id]);

  const handleChange = (dpId: string, field: string, value: any) => {
    setConfigs(prev => ({
      ...prev,
      [dpId]: { ...prev[dpId], [field]: value },
    }));
  };

  const handleSave = async (dp: any) => {
    if (!id) return;
    setSaving(dp.id);
    try {
      const dpKey = dp.parsingKey || dp.name;
      await updateSimConfig(id, dpKey, configs[dp.id]);
      setSaved(dp.id);
      setTimeout(() => setSaved(null), 2000);
      setError('');
    } catch { setError('Failed to save config for ' + dp.name); }
    finally { setSaving(null); }
  };

  return (
    <div className="fade-in">
      <div className="page-header">
        <button className="btn btn-ghost" style={{ marginBottom: 16 }} onClick={() => navigate(`/devices/${id}`)}>
          <ArrowLeft size={14} /> Back to Device
        </button>
        <h1 className="page-title">Simulator Configuration</h1>
        <p className="page-subtitle">Configure telemetry patterns per datapoint</p>
      </div>

      {error && (
        <div className="alert alert-error">
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {loading ? (
        <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)' }}>Loading…</div>
      ) : datapoints.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 48 }}>
          <p style={{ color: 'var(--text-muted)' }}>No datapoints found. Sync datapoints from the Device page first.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {datapoints.map((dp) => {
            const cfg = configs[dp.id] || {};
            const isSaving = saving === dp.id;
            const wasSaved = saved  === dp.id;
            const pat = cfg.pattern || 'RANDOM';
            return (
              <div key={dp.id} className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
                  <div>
                    <span style={{ fontFamily: 'monospace', fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>{dp.name}</span>
                    {dp.unit && <span style={{ marginLeft: 10, fontSize: 13, color: 'var(--text-muted)' }}>({dp.unit})</span>}
                  </div>
                  <button
                    className={`btn ${wasSaved ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => handleSave(dp)}
                    disabled={isSaving}
                    style={{ fontSize: 13 }}
                  >
                    <Save size={13} />
                    {isSaving ? 'Saving…' : wasSaved ? '✓ Saved' : 'Save'}
                  </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
                  {/* Pattern */}
                  <div className="form-group">
                    <label>Pattern</label>
                    <select
                      className="input"
                      value={pat}
                      onChange={e => handleChange(dp.id, 'pattern', e.target.value)}
                    >
                      {PATTERNS.map(p => <option key={p} value={p}>{p.replace(/_/g, ' ')}</option>)}
                    </select>
                  </div>

                  {/* Min Value */}
                  <div className="form-group">
                    <label>Min Value</label>
                    <input
                      type="number" className="input"
                      value={cfg.minValue ?? 0}
                      onChange={e => handleChange(dp.id, 'minValue', parseFloat(e.target.value))}
                    />
                  </div>

                  {/* Max Value */}
                  <div className="form-group">
                    <label>Max Value</label>
                    <input
                      type="number" className="input"
                      value={cfg.maxValue ?? 100}
                      onChange={e => handleChange(dp.id, 'maxValue', parseFloat(e.target.value))}
                    />
                  </div>

                  {/* Start Value — shown for patterns that use it */}
                  {USES_START.has(pat) && (
                    <div className="form-group">
                      <label>Start Value</label>
                      <input
                        type="number" className="input"
                        value={cfg.startValue ?? 0}
                        onChange={e => handleChange(dp.id, 'startValue', parseFloat(e.target.value))}
                      />
                    </div>
                  )}

                  {/* Step Value — shown for patterns that use it */}
                  {USES_STEP.has(pat) && (
                    <div className="form-group">
                      <label>{pat === 'EXPONENTIAL_DECAY' ? 'Decay % per tick' : 'Step Value'}</label>
                      <input
                        type="number" step="0.1" className="input"
                        value={cfg.stepValue ?? 1}
                        onChange={e => handleChange(dp.id, 'stepValue', parseFloat(e.target.value))}
                      />
                    </div>
                  )}

                  {/* Publish Interval */}
                  <div className="form-group">
                    <label>Publish Interval (ms)</label>
                    <input
                      type="number" step="500" min="500" className="input"
                      value={cfg.publishIntervalMs ?? 5000}
                      onChange={e => handleChange(dp.id, 'publishIntervalMs', parseInt(e.target.value))}
                    />
                  </div>
                </div>

                {/* Preview */}
                <div style={{ marginTop: 16, padding: '10px 14px', background: 'var(--bg-elevated)', borderRadius: 8, fontSize: 12, color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                  Preview: {getPreview(cfg)} every {(cfg.publishIntervalMs ?? 5000) / 1000}s
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default SimulatorConfig;


