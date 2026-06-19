import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, RotateCcw } from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, LabelList
} from 'recharts';
import { getDevice, getDatapoints, getHistoricalTelemetryZoho } from '../api';

const HistoricalGraph: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [device, setDevice] = useState<any>(null);
  const [datapoints, setDatapoints] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Form state
  const [selectedDp, setSelectedDp] = useState<string>('');
  const [period, setPeriod] = useState<string>('last24hours');
  const [customStart, setCustomStart] = useState<string>('');
  const [customEnd, setCustomEnd] = useState<string>('');
  const [aggregation, setAggregation] = useState<string>('avg');
  const [timeGrouping, setTimeGrouping] = useState<string>('hour');
  
  // View state
  const [viewMode, setViewMode] = useState<'graph' | 'raw'>('graph');

  // Graph state
  const [graphData, setGraphData] = useState<any[]>([]);
  const [fetchingData, setFetchingData] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!id) return;
    Promise.all([getDevice(id), getDatapoints(id)])
      .then(([devRes, dpRes]) => {
        setDevice(devRes.data);
        setDatapoints(dpRes.data);
        if (dpRes.data.length > 0) {
          setSelectedDp(dpRes.data[0].id);
        }
      })
      .catch(() => navigate('/devices'))
      .finally(() => setLoading(false));
  }, [id, navigate]);

  const fetchData = async () => {
    if (!id || !selectedDp) return;
    setFetchingData(true);
    setErrorMsg('');
    try {
      const dp = datapoints.find((d: any) => d.id === selectedDp);
      if (!dp) return;
      // Zoho API expects the actual display name for the datapoint_name parameter, not the parsing key
      const dpName = dp.name;

      const params: any = {
        datapointName: dpName,
        period,
        aggregation,
        timeGrouping: timeGrouping || undefined
      };

      if (period === 'custom') {
        if (!customStart || !customEnd) {
          setErrorMsg('Please select both a start and end date for the custom range.');
          setFetchingData(false);
          return;
        }
        params.startTime = new Date(customStart).getTime();
        params.endTime = new Date(customEnd).getTime();
      }

      const res = await getHistoricalTelemetryZoho(id, params);
      
      // Zoho API returns { data: [{ "time": 17234234234, "value": 23.4 }, ...] } typically.
      // We need to parse this into recharts format
      let dataArray: any[] = [];
      let responseData = res.data;
      
      if (typeof responseData === 'string') {
         try {
             responseData = JSON.parse(responseData);
         } catch(e) {}
      }

      // Check if it's the specific Zoho {"DatapointName": [[time, value],...]} or {"DatapointName": 20} format
      if (responseData && typeof responseData === 'object' && !Array.isArray(responseData)) {
         if (responseData[dpName] !== undefined) {
            const val = responseData[dpName];
            if (Array.isArray(val)) {
               dataArray = val; // Time series format
            } else {
               // Single value format (e.g. {"Temperature": 20})
               dataArray = [[new Date().toLocaleString(), val]];
            }
         } else if (responseData.data && Array.isArray(responseData.data)) {
            if (responseData.data.length > 0 && responseData.data[0][dpName] && Array.isArray(responseData.data[0][dpName])) {
                dataArray = responseData.data[0][dpName];
            } else {
                dataArray = responseData.data;
            }
         } else if (responseData.data && responseData.data.result && Array.isArray(responseData.data.result)) {
            if (responseData.data.result.length > 0 && responseData.data.result[0][dpName] && Array.isArray(responseData.data.result[0][dpName])) {
                dataArray = responseData.data.result[0][dpName];
            } else {
                dataArray = responseData.data.result;
            }
         } else if (responseData.datapoints && Array.isArray(responseData.datapoints)) {
            dataArray = responseData.datapoints;
         } else {
            // Try to find any key containing an array
            const firstKey = Object.keys(responseData).find(k => Array.isArray(responseData[k]));
            if (firstKey) {
               dataArray = responseData[firstKey];
            } else {
               // Try to find any key containing a scalar value
               const scalarKey = Object.keys(responseData).find(k => typeof responseData[k] === 'number' || typeof responseData[k] === 'string');
               if (scalarKey) {
                  dataArray = [[new Date().toLocaleString(), responseData[scalarKey]]];
               }
            }
         }
      } else if (Array.isArray(responseData)) {
         dataArray = responseData;
      }
      
      if (!Array.isArray(dataArray)) {
         setErrorMsg("Received unexpected data format from Zoho.");
         setGraphData([]);
         return;
      }
      
      if (dataArray.length === 0) {
         setErrorMsg("No data found for the selected period.");
         setGraphData([]);
         return;
      }

      // Convert times to formatted strings
      const formatted = dataArray.map((pt: any) => {
        if (Array.isArray(pt)) {
           // Zoho array format: ["Jun 10 12 AM - Jun 10 01 AM", 29.28]
           return {
             time: pt[0] || 'Unknown',
             value: pt[1] == null ? null : Number(pt[1])
           };
        } else {
           // Fallback standard object format
           let timeStr = 'Unknown';
           if (pt.timestamp_string) {
               timeStr = pt.timestamp_string;
           } else {
               const ts = pt.time || pt.timestamp || pt.time_stamp;
               if (ts) {
                   // If it's a string of digits like "1781073000000", convert to Number first
                   const tsNum = typeof ts === 'string' && /^\d+$/.test(ts) ? Number(ts) : ts;
                   timeStr = new Date(tsNum).toLocaleString();
               }
           }
           
           const val = pt.value !== undefined ? pt.value : pt[aggregation];
           return {
             time: timeStr,
             value: val == null ? null : Number(val)
           };
        }
      });

      setGraphData(formatted);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.error || err.message || 'Failed to fetch historical data');
      setGraphData([]);
    } finally {
      setFetchingData(false);
    }
  };

  useEffect(() => {
    if (selectedDp) {
      fetchData();
    }
  }, [selectedDp, period, aggregation, timeGrouping]);

  if (loading) return <div style={{ padding: 48, textAlign: 'center' }}>Loading...</div>;

  return (
    <div className="fade-in">
      <div className="page-header">
        <button className="btn btn-ghost" style={{ marginBottom: 16 }} onClick={() => navigate(`/devices/${id}`)}>
          <ArrowLeft size={14} /> Back to Device
        </button>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1 className="page-title">Historical Telemetry Graph</h1>
        </div>
        <p className="page-subtitle">{device?.name} - Historical data sourced directly from Zoho IoT</p>
      </div>

      <div className="card" style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase' }}>
              Datapoint
            </label>
            <select className="input" value={selectedDp} onChange={e => setSelectedDp(e.target.value)} style={{ minWidth: 150 }}>
              {datapoints.map(dp => (
                <option key={dp.id} value={dp.id}>{dp.name}</option>
              ))}
              {datapoints.length === 0 && <option value="">No datapoints</option>}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase' }}>
              Period
            </label>
            <select className="input" value={period} onChange={e => setPeriod(e.target.value)} style={{ minWidth: 150 }}>
              <option value="lasthour">Last Hour</option>
              <option value="last24hours">Last 24 Hours</option>
              <option value="today">Today</option>
              <option value="yesterday">Yesterday</option>
              <option value="thisweek">This Week</option>
              <option value="last7days">Last 7 Days</option>
              <option value="lastweek">Last Week</option>
              <option value="thismonth">This Month</option>
              <option value="lastmonth">Last Month</option>
              <option value="last30days">Last 30 Days</option>
              <option value="custom">Custom Range</option>
            </select>
          </div>
          {period === 'custom' && (
            <>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase' }}>
                  Start
                </label>
                <input type="datetime-local" className="input" value={customStart} onChange={e => setCustomStart(e.target.value)} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase' }}>
                  End
                </label>
                <input type="datetime-local" className="input" value={customEnd} onChange={e => setCustomEnd(e.target.value)} />
              </div>
            </>
          )}
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase' }}>
              Aggregation
            </label>
            <select className="input" value={aggregation} onChange={e => setAggregation(e.target.value)} style={{ minWidth: 120 }}>
              <option value="raw">Raw (None)</option>
              <option value="avg">Average</option>
              <option value="sum">Sum</option>
              <option value="max">Maximum</option>
              <option value="min">Minimum</option>
              <option value="last_value">Last Value</option>
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase' }}>
              Time Grouping
            </label>
            <select className="input" value={timeGrouping} onChange={e => setTimeGrouping(e.target.value)} style={{ minWidth: 120 }}>
              <option value="">None</option>
              <option value="hour">By Hour</option>
              <option value="day">By Day</option>
              <option value="week">By Week</option>
              <option value="month">By Month</option>
            </select>
          </div>
          <button className="btn btn-secondary" onClick={fetchData} disabled={fetchingData || !selectedDp}>
            {fetchingData ? <RotateCcw size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <RotateCcw size={14} />}
            Refresh
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <button 
          className={`btn ${viewMode === 'graph' ? 'btn-primary' : 'btn-secondary'}`} 
          onClick={() => setViewMode('graph')}
          style={{ flex: 1, maxWidth: 120, justifyContent: 'center' }}
        >
          Graph View
        </button>
        <button 
          className={`btn ${viewMode === 'raw' ? 'btn-primary' : 'btn-secondary'}`} 
          onClick={() => setViewMode('raw')}
          style={{ flex: 1, maxWidth: 120, justifyContent: 'center' }}
        >
          Raw Data
        </button>
      </div>

      <div className="card" style={{ height: 500, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {errorMsg ? (
          <div className="alert alert-error">
            <strong>Error fetching data:</strong> {errorMsg}
          </div>
        ) : fetchingData && graphData.length === 0 ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
            Loading graph data from Zoho...
          </div>
        ) : graphData.length === 0 ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
            No data found for the selected period.
          </div>
        ) : viewMode === 'raw' ? (
          <div style={{ flex: 1, overflowY: 'auto', padding: '0 16px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border-subtle)', position: 'sticky', top: 0, backgroundColor: '#fff', zIndex: 1 }}>
                  <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontWeight: 600, fontSize: 13 }}>Time</th>
                  <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontWeight: 600, fontSize: 13 }}>Value</th>
                </tr>
              </thead>
              <tbody>
                {graphData.map((pt, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td style={{ padding: '12px 16px', fontSize: 14 }}>{pt.time}</td>
                    <td style={{ padding: '12px 16px', fontSize: 14, fontWeight: 500 }}>{pt.value !== null ? pt.value : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={graphData} margin={{ top: 30, right: 30, left: 20, bottom: 60 }}>
              <defs>
                <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#1976d2" stopOpacity={0.15}/>
                  <stop offset="95%" stopColor="#1976d2" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
              <XAxis 
                dataKey="time" 
                stroke="#9aa0a6" 
                fontSize={12} 
                tickMargin={10}
                angle={-45}
                textAnchor="end"
              />
              <YAxis 
                stroke="#9aa0a6" 
                fontSize={12} 
                label={{ 
                  value: datapoints.find(dp => dp.name === selectedDp)?.unit ? `${selectedDp} (${datapoints.find(dp => dp.name === selectedDp)?.unit})` : selectedDp, 
                  angle: -90, 
                  position: 'insideLeft', 
                  style: { textAnchor: 'middle', fill: '#9aa0a6', fontSize: 13, fontWeight: 600 },
                  offset: -5
                }} 
              />
              <RechartsTooltip 
                contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
                itemStyle={{ color: '#1a1a1a', fontWeight: 600 }}
              />
              <Area 
                type="linear" 
                dataKey="value" 
                stroke="#1976d2" 
                fillOpacity={1}
                fill="url(#colorValue)"
                strokeWidth={2} 
                dot={{ r: 3, fill: '#1976d2', strokeWidth: 0 }}
                activeDot={{ r: 6, stroke: '#fff', strokeWidth: 2 }}
                name={selectedDp}
                animationDuration={500}
                isAnimationActive={false}
              >
                <LabelList 
                  dataKey="value" 
                  position="top" 
                  offset={10} 
                  style={{ fontSize: '11px', fill: '#1a1a1a', fontWeight: 600 }} 
                />
              </Area>
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

export default HistoricalGraph;
