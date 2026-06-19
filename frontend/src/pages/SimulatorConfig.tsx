import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, AlertCircle } from 'lucide-react';
import { getDatapoints, updateSimConfig } from '../api';

const PATTERNS = ['RANDOM', 'INCREMENTAL', 'DECREMENTAL'];

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
                      value={cfg.pattern || 'RANDOM'}
                      onChange={e => handleChange(dp.id, 'pattern', e.target.value)}
                    >
                      {PATTERNS.map(p => <option key={p} value={p}>{p}</option>)}
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

                  {/* Start Value */}
                  {(cfg.pattern === 'INCREMENTAL' || cfg.pattern === 'DECREMENTAL') && (
                    <div className="form-group">
                      <label>Start Value</label>
                      <input
                        type="number" className="input"
                        value={cfg.startValue ?? 0}
                        onChange={e => handleChange(dp.id, 'startValue', parseFloat(e.target.value))}
                      />
                    </div>
                  )}

                  {/* Step Value */}
                  {(cfg.pattern === 'INCREMENTAL' || cfg.pattern === 'DECREMENTAL') && (
                    <div className="form-group">
                      <label>Step Value</label>
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
                  Preview: {cfg.pattern === 'RANDOM'
                    ? `random(${cfg.minValue ?? 0}, ${cfg.maxValue ?? 100})`
                    : cfg.pattern === 'INCREMENTAL'
                    ? `${cfg.startValue ?? 0} → +${cfg.stepValue ?? 1} → max(${cfg.maxValue ?? 100})`
                    : `${cfg.startValue ?? 100} → -${cfg.stepValue ?? 1} → min(${cfg.minValue ?? 0})`}
                  {' '}every {(cfg.publishIntervalMs ?? 5000) / 1000}s
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
