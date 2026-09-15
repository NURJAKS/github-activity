'use client';

import React, { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { ShieldAlert, CheckCircle, AlertTriangle, FileText, Activity } from 'lucide-react';
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
  reasons: string[];
}

export default function Dashboard() {
  const [data, setData] = useState<MergedData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  if (loading) return <div className={styles.loading}>Загрузка данных аудита...</div>;
  if (error) return <div className={styles.error}>Ошибка: {error}</div>;

  // Агрегация метрик
  const total = data.length;
  const highRisk = data.filter(d => d.risk_level === 'высокий риск').length;
  const checkRisk = data.filter(d => d.risk_level === 'требует проверки').length;
  const okRisk = data.filter(d => d.risk_level === 'норма').length;

  const pieData = [
    { name: 'Высокий риск', value: highRisk, color: '#ef4444' },
    { name: 'Требует проверки', value: checkRisk, color: '#f59e0b' },
    { name: 'Норма', value: okRisk, color: '#10b981' }
  ];

  return (
    <div className={styles.dashboard}>
      <h2 className={styles.title}><Activity className={styles.icon} /> Сводка Аудита Госзакупок</h2>
      
      <div className={styles.metricsGrid}>
        <div className={`${styles.metricCard} ${styles.high}`}>
          <div className={styles.metricHeader}>
            <span>Критичные контракты</span>
            <ShieldAlert />
          </div>
          <div className={styles.metricValue}>{highRisk}</div>
        </div>
        <div className={`${styles.metricCard} ${styles.check}`}>
          <div className={styles.metricHeader}>
            <span>Требуют проверки</span>
            <AlertTriangle />
          </div>
          <div className={styles.metricValue}>{checkRisk}</div>
        </div>
        <div className={`${styles.metricCard} ${styles.ok}`}>
          <div className={styles.metricHeader}>
            <span>Без нарушений</span>
            <CheckCircle />
          </div>
          <div className={styles.metricValue}>{okRisk}</div>
        </div>
        <div className={styles.metricCard}>
          <div className={styles.metricHeader}>
            <span>Всего проверено</span>
            <FileText />
          </div>
          <div className={styles.metricValue}>{total}</div>
        </div>
      </div>

      <div className={styles.chartsGrid}>
        <div className={styles.chartContainer}>
          <h3>Распределение уровня риска</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value">
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className={styles.tableContainer}>
        <h3>Детализация по файлам</h3>
        <table className={styles.table}>
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
            {data.slice(0, 10).map((row, i) => (
              <tr key={i}>
                <td>{row.source_file || 'Неизвестно'}</td>
                <td><span className={`${styles.badge} ${styles[row.risk_level === 'высокий риск' ? 'high' : row.risk_level === 'требует проверки' ? 'check' : 'ok']}`}>{row.risk_level}</span></td>
                <td>{row.components.price}</td>
                <td>{row.components.fragmentation}</td>
                <td>{row.components.tor}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {data.length > 10 && <p className={styles.tableNote}>Показаны первые 10 записей (из {data.length})</p>}
      </div>
    </div>
  );
}
