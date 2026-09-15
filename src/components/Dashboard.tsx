'use client';

import React, { useEffect, useState } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, 
  AreaChart, Area, CartesianGrid 
} from 'recharts';
import { 
  ShieldAlert, CheckCircle, AlertTriangle, FileText, Activity, 
  TrendingDown, TrendingUp, DollarSign, Layers, FileSearch 
} from 'lucide-react';
import styles from './Dashboard.module.css';

// Типы
type RiskLevel = 'норма' | 'требует проверки' | 'высокий риск';

interface MergedData {
  source_file: string;
  risk_level: RiskLevel;
  contract: any;
  components: {
    price: RiskLevel;
    fragmentation: RiskLevel;
    integrity: RiskLevel;
    tor: RiskLevel;
  };
  benchmark?: {
    price_deviation_pct: number;
    category: string;
    item_name: string;
    avg_market_price: number;
    contract_price: number;
  };
  reasons: string[];
}

export default function Dashboard() {
  const [data, setData] = useState<MergedData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'summary' | 'prices'>('summary');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const baseUrl = process.env.NEXT_PUBLIC_API_URL || '';
        const res = await fetch(`${baseUrl}/api/dashboard-data`);
        if (!res.ok) throw new Error('Ошибка загрузки данных');
        const json = await res.json();
        setData(json.data.merged);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) return <div className={styles.loadingContainer}><div className={styles.spinner}></div><p>Анализ данных аудита...</p></div>;
  if (error) return <div className={styles.error}>Ошибка соединения: {error}</div>;

  // Агрегация метрик
  const total = data.length;
  const highRisk = data.filter(d => d.risk_level === 'высокий риск').length;
  const checkRisk = data.filter(d => d.risk_level === 'требует проверки').length;
  const okRisk = data.filter(d => d.risk_level === 'норма').length;

  const pieData = [
    { name: 'Высокий риск', value: highRisk, color: '#ff4b4b' },
    { name: 'Требует проверки', value: checkRisk, color: '#f5a623' },
    { name: 'Норма', value: okRisk, color: '#10b981' }
  ];

  const priceData = data
    .filter(d => d.benchmark && d.benchmark.price_deviation_pct)
    .map(d => ({
      name: d.contract?.contract_number?.substring(0,8) || 'Договор',
      deviation: d.benchmark?.price_deviation_pct || 0,
      marketPrice: d.benchmark?.avg_market_price || 0,
      contractPrice: d.benchmark?.contract_price || 0
    }))
    .slice(0, 15);

  return (
    <div className={styles.dashboardWrapper}>
      <header className={styles.header}>
        <div className={styles.headerTitle}>
          <div className={styles.logoGlow}><Activity size={36} color="#fff" /></div>
          <div>
            <h1>Hackathon Korkyt Analytics</h1>
            <p>Модуль ИИ-аудита государственных закупок</p>
          </div>
        </div>
        <div className={styles.tabs}>
          <button 
            className={`${styles.tab} ${activeTab === 'summary' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('summary')}
          >
            <Layers size={18} /> Сводка
          </button>
          <button 
            className={`${styles.tab} ${activeTab === 'prices' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('prices')}
          >
            <DollarSign size={18} /> Анализ Цен
          </button>
        </div>
      </header>
      
      {activeTab === 'summary' && (
        <div className={styles.fadeEnter}>
          <div className={styles.metricsGrid}>
            <div className={`${styles.metricCard} ${styles.highRiskCard}`}>
              <div className={styles.metricHeader}>
                <span>Критичные контракты</span>
                <ShieldAlert className={styles.pulseIcon} />
              </div>
              <div className={styles.metricValue}>{highRisk}</div>
              <div className={styles.metricFooter}>Требуют немедленного вмешательства</div>
            </div>
            <div className={`${styles.metricCard} ${styles.warnRiskCard}`}>
              <div className={styles.metricHeader}>
                <span>Желтая зона</span>
                <AlertTriangle />
              </div>
              <div className={styles.metricValue}>{checkRisk}</div>
              <div className={styles.metricFooter}>Подозрение на дробление / завышение</div>
            </div>
            <div className={`${styles.metricCard} ${styles.okRiskCard}`}>
              <div className={styles.metricHeader}>
                <span>Без нарушений</span>
                <CheckCircle />
              </div>
              <div className={styles.metricValue}>{okRisk}</div>
              <div className={styles.metricFooter}>Контракты в пределах нормы</div>
            </div>
            <div className={styles.metricCard}>
              <div className={styles.metricHeader}>
                <span>Всего проверено</span>
                <FileText />
              </div>
              <div className={styles.metricValue}>{total}</div>
              <div className={styles.metricFooter}>Обработано ИИ-модулем</div>
            </div>
          </div>

          <div className={styles.chartsGrid}>
            <div className={styles.chartBox}>
              <h3>Распределение уровня риска</h3>
              <ResponsiveContainer width="100%" height={320}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={80} outerRadius={110} paddingAngle={8} dataKey="value" stroke="none">
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} style={{ filter: `drop-shadow(0px 0px 8px ${entry.color}80)` }} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'rgba(15,23,42,0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                  />
                  <Legend verticalAlign="bottom" height={36} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            
            <div className={styles.chartBox}>
              <h3>Ключевые сигналы (Причины риска)</h3>
              <div className={styles.signalsList}>
                <div className={styles.signalItem}>
                  <div className={styles.signalIcon} style={{background: 'rgba(239, 68, 68, 0.2)', color: '#ef4444'}}><TrendingUp /></div>
                  <div className={styles.signalInfo}>
                    <h4>Завышение цен</h4>
                    <p>Контракты с аномальным отклонением от рыночной медианы.</p>
                  </div>
                </div>
                <div className={styles.signalItem}>
                  <div className={styles.signalIcon} style={{background: 'rgba(245, 158, 11, 0.2)', color: '#f59e0b'}}><Layers /></div>
                  <div className={styles.signalInfo}>
                    <h4>Дробление закупок</h4>
                    <p>Искусственное разделение лотов для обхода тендера.</p>
                  </div>
                </div>
                <div className={styles.signalItem}>
                  <div className={styles.signalIcon} style={{background: 'rgba(139, 92, 246, 0.2)', color: '#8b5cf6'}}><FileSearch /></div>
                  <div className={styles.signalInfo}>
                    <h4>Сговор в ТЗ</h4>
                    <p>Спецификации, заточенные под конкретного поставщика.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className={styles.tableBox}>
            <h3>Детализация по контрактам</h3>
            <div className={styles.tableScroll}>
              <table className={styles.dataTable}>
                <thead>
                  <tr>
                    <th>Файл (Договор)</th>
                    <th>Общий Риск</th>
                    <th>Цена</th>
                    <th>Дробление</th>
                    <th>ТЗ</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((row, i) => (
                    <tr key={i} className={styles.tableRow}>
                      <td className={styles.cellFile}>
                        <FileText size={14} className={styles.cellIcon}/>
                        {row.source_file || 'Неизвестно'}
                      </td>
                      <td><span className={`${styles.badge} ${styles[row.risk_level === 'высокий риск' ? 'high' : row.risk_level === 'требует проверки' ? 'warn' : 'ok']}`}>{row.risk_level}</span></td>
                      <td><span className={row.components.price !== 'норма' ? styles.textWarn : styles.textOk}>{row.components.price}</span></td>
                      <td><span className={row.components.fragmentation !== 'норма' ? styles.textWarn : styles.textOk}>{row.components.fragmentation}</span></td>
                      <td><span className={row.components.tor !== 'норма' ? styles.textWarn : styles.textOk}>{row.components.tor}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'prices' && (
        <div className={styles.fadeEnter}>
          <div className={styles.chartBoxFull}>
            <h3>Отклонение контрактов от рыночных медиан (%)</h3>
            <p className={styles.chartDesc}>График показывает, насколько цена в договоре превышает среднюю по рынку.</p>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={priceData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="name" stroke="#64748b" />
                <YAxis stroke="#64748b" />
                <Tooltip 
                  cursor={{fill: 'rgba(255,255,255,0.02)'}}
                  contentStyle={{ backgroundColor: 'rgba(15,23,42,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                />
                <Legend />
                <Bar dataKey="deviation" name="Отклонение (%)" fill="url(#colorDev)" radius={[6, 6, 0, 0]} />
                <defs>
                  <linearGradient id="colorDev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ff4b4b" stopOpacity={1}/>
                    <stop offset="95%" stopColor="#ff4b4b" stopOpacity={0.2}/>
                  </linearGradient>
                </defs>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
