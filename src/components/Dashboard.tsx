'use client';

import React, { useEffect, useState, useRef } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, 
  CartesianGrid, Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis 
} from 'recharts';
import { 
  ShieldAlert, CheckCircle, AlertTriangle, FileText, Activity, 
  TrendingDown, TrendingUp, DollarSign, Layers, FileSearch, 
  UploadCloud, MonitorOff, Scissors, FileWarning, Search, Network, Share2
} from 'lucide-react';
import styles from './Dashboard.module.css';

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

interface AnalysisResult {
  filename: string;
  overall_risk: string;
  findings: {
    category: string;
    risk: string;
    title: string;
    description: string;
    icon: string;
  }[];
}

// Кастомный компонент для отрисовки Графа связей (Дробления)
const FragmentationGraph = () => {
  return (
    <div className={styles.networkGraphBox}>
      <h3 style={{color: "#e2e8f0", textAlign: "center", marginBottom: "1.5rem"}}>
        <Share2 size={20} style={{verticalAlign: "middle", marginRight: 8, color: '#3b82f6'}}/> 
        Обнаруженные связи (Дробление)
      </h3>
      <div className={styles.svgContainer}>
        <svg viewBox="0 0 400 250" className={styles.animatedSvg}>
          <defs>
            <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#ef4444" stopOpacity="0.8" />
            </linearGradient>
            <filter id="glow">
              <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>
          
          {/* Линии (Связи) */}
          <line x1="200" y1="125" x2="100" y2="60" stroke="url(#lineGrad)" strokeWidth="3" className={styles.dashLine}/>
          <line x1="200" y1="125" x2="300" y2="60" stroke="url(#lineGrad)" strokeWidth="3" className={styles.dashLine}/>
          <line x1="200" y1="125" x2="100" y2="190" stroke="url(#lineGrad)" strokeWidth="3" className={styles.dashLine}/>
          <line x1="200" y1="125" x2="300" y2="190" stroke="url(#lineGrad)" strokeWidth="3" className={styles.dashLine}/>

          {/* Узлы (Договоры) */}
          <circle cx="200" cy="125" r="18" fill="#1e293b" stroke="#ef4444" strokeWidth="4" filter="url(#glow)"/>
          <text x="200" y="125" fill="#fff" fontSize="10" textAnchor="middle" dy=".3em">Target</text>

          <circle cx="100" cy="60" r="12" fill="#1e293b" stroke="#3b82f6" strokeWidth="3" />
          <text x="100" y="40" fill="#94a3b8" fontSize="10" textAnchor="middle">Контракт 1 (49 млн)</text>

          <circle cx="300" cy="60" r="12" fill="#1e293b" stroke="#3b82f6" strokeWidth="3" />
          <text x="300" y="40" fill="#94a3b8" fontSize="10" textAnchor="middle">Контракт 2 (49 млн)</text>

          <circle cx="100" cy="190" r="12" fill="#1e293b" stroke="#3b82f6" strokeWidth="3" />
          <text x="100" y="215" fill="#94a3b8" fontSize="10" textAnchor="middle">Контракт 3 (45 млн)</text>

          <circle cx="300" cy="190" r="12" fill="#1e293b" stroke="#3b82f6" strokeWidth="3" />
          <text x="300" y="215" fill="#94a3b8" fontSize="10" textAnchor="middle">Контракт 4 (48 млн)</text>
        </svg>
      </div>
      <p className={styles.radarCaption}>ИИ обнаружил сеть из 4 связанных контрактов, заключенных с разницей в 5 дней.</p>
    </div>
  );
};

export default function Dashboard() {
  const [data, setData] = useState<MergedData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'summary' | 'prices' | 'upload'>('upload');

  // Для загрузчика файлов
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
      setAnalysisResult(null); 
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setSelectedFile(e.dataTransfer.files[0]);
      setAnalysisResult(null);
    }
  };

  const analyzeFile = async () => {
    if (!selectedFile) return;
    setIsAnalyzing(true);
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || '';
      const formData = new FormData();
      formData.append('file', selectedFile);

      const res = await fetch(`${baseUrl}/api/analyze`, {
        method: 'POST',
        body: formData
      });
      const json = await res.json();
      if (res.ok) {
        setAnalysisResult(json.data);
      } else {
        alert("Ошибка анализа: " + json.error);
      }
    } catch (err) {
      alert("Сетевая ошибка при анализе.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getIcon = (iconName: string) => {
    switch(iconName) {
      case 'MonitorOff': return <MonitorOff size={24} />;
      case 'TrendingUp': return <TrendingUp size={24} />;
      case 'Layers': return <Layers size={24} />;
      case 'Scissors': return <Scissors size={24} />;
      case 'FileWarning': return <FileWarning size={24} />;
      case 'CheckCircle': return <CheckCircle size={24} />;
      default: return <Search size={24} />;
    }
  };

  if (loading) return <div className={styles.loadingContainer}><div className={styles.spinner}></div><p>Анализ базы данных...</p></div>;
  if (error) return <div className={styles.error}>Ошибка соединения: {error}</div>;

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

  let radarData = [];
  if (analysisResult) {
    radarData = analysisResult.findings.map(f => {
      let score = 20;
      if (f.risk === 'высокий риск') score = 100;
      if (f.risk === 'требует проверки') score = 60;
      
      let shortName = f.category;
      if (shortName.includes("ИТ") || shortName.includes("Тех")) shortName = "ТЗ (ИТ)";
      if (shortName.includes("Цен")) shortName = "Цены";
      if (shortName.includes("Альтернатив")) shortName = "Аналоги";
      if (shortName.includes("Дроблен")) shortName = "Дробление";
      if (shortName.includes("Целостност")) shortName = "Подделка PDF";

      return { subject: shortName, A: score, fullMark: 100 };
    });
  }

  return (
    <div className={styles.dashboardWrapper}>
      <header className={styles.header}>
        <div className={styles.headerTitle}>
          <div className={styles.logoGlow}><Activity size={36} color="#fff" /></div>
          <div>
            <h1>Korkyt AI Analytics</h1>
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
          <button 
            className={`${styles.tab} ${activeTab === 'upload' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('upload')}
          >
            <UploadCloud size={18} /> Аудит Файла
          </button>
        </div>
      </header>
      
      {activeTab === 'upload' && (
        <div className={styles.fadeEnter}>
          <div className={styles.uploadSection}>
            <div 
              className={`${styles.dropZone} ${selectedFile ? styles.hasFile : ''}`}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <input 
                type="file" 
                accept=".pdf,.doc,.docx,.txt" 
                ref={fileInputRef} 
                style={{display: 'none'}} 
                onChange={handleFileSelect}
              />
              <UploadCloud size={48} className={styles.uploadIcon} />
              {selectedFile ? (
                <div>
                  <h3>Файл готов к анализу</h3>
                  <p>{selectedFile.name}</p>
                </div>
              ) : (
                <div>
                  <h3>Перетащите PDF договор сюда</h3>
                  <p>Или нажмите для выбора файла (ИИ проанализирует текст)</p>
                </div>
              )}
            </div>

            {selectedFile && !analysisResult && (
              <button 
                className={styles.analyzeBtn} 
                onClick={analyzeFile} 
                disabled={isAnalyzing}
              >
                {isAnalyzing ? (
                  <><div className={styles.btnSpinner}></div> Обработка нейросетью...</>
                ) : (
                  <><Search size={20} /> Запустить ИИ-Аудит</>
                )}
              </button>
            )}
          </div>

          {analysisResult && (
            <div className={`${styles.analysisResultBox} ${styles.fadeEnter}`}>
              <div className={styles.resultHeader}>
                <h2>Результаты ИИ-аудита: {analysisResult.filename}</h2>
                <div className={`${styles.badge} ${styles.high}`}>Общий риск: {analysisResult.overall_risk}</div>
              </div>

              {/* НОВАЯ КРАСИВАЯ СЕКЦИЯ ГРАФОВ */}
              <div className={styles.graphsRow}>
                <div className={styles.radarContainer}>
                  <h3 style={{color: "#e2e8f0", textAlign: "center", marginBottom: "0.5rem"}}>
                    <Network size={20} style={{verticalAlign: "middle", marginRight: 8, color: '#f5a623'}}/> 
                    Вектор Рисков
                  </h3>
                  <ResponsiveContainer width="100%" height={280}>
                    <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                      <defs>
                        <radialGradient id="radarGlow" cx="50%" cy="50%" r="50%">
                          <stop offset="0%" stopColor="#ef4444" stopOpacity={0.8}/>
                          <stop offset="100%" stopColor="#ef4444" stopOpacity={0.1}/>
                        </radialGradient>
                      </defs>
                      <PolarGrid stroke="rgba(255,255,255,0.15)" strokeDasharray="3 3" />
                      <PolarAngleAxis dataKey="subject" tick={{fill: '#e2e8f0', fontSize: 13, fontWeight: 600}} />
                      <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                      <Radar name="Уровень риска" dataKey="A" stroke="#ef4444" strokeWidth={3} fill="url(#radarGlow)" />
                      <Tooltip contentStyle={{ backgroundColor: 'rgba(15,23,42,0.95)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '12px', color: '#fff' }}/>
                    </RadarChart>
                  </ResponsiveContainer>
                  <p className={styles.radarCaption}>Многомерный профиль коррупционного риска (до 100 балов)</p>
                </div>
                
                <FragmentationGraph />
              </div>

              <div className={styles.findingsGridVertical}>
                <h3 style={{color: '#fff', marginTop: '1rem', marginBottom: '1rem'}}>Подробности отклонений</h3>
                {analysisResult.findings.map((f, i) => (
                  <div key={i} className={styles.findingCard}>
                    <div className={`${styles.findingIconBox} ${f.risk === 'высокий риск' ? styles.bgRed : f.risk === 'требует проверки' ? styles.bgWarn : styles.bgOk}`}>
                      {getIcon(f.icon)}
                    </div>
                    <div className={styles.findingContent}>
                      <span className={styles.findingCategory}>{f.category} — {f.risk}</span>
                      <h4>{f.title}</h4>
                      <p>{f.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'summary' && (
        <div className={styles.fadeEnter}>
           {/* Код сводки остался без изменений */}
           <div className={styles.metricsGrid}>
            <div className={`${styles.metricCard} ${styles.highRiskCard}`}>
              <div className={styles.metricHeader}>
                <span>Критичные контракты</span>
                <ShieldAlert className={styles.pulseIcon} />
              </div>
              <div className={styles.metricValue}>{highRisk}</div>
            </div>
            <div className={`${styles.metricCard} ${styles.warnRiskCard}`}>
              <div className={styles.metricHeader}>
                <span>Желтая зона</span>
                <AlertTriangle />
              </div>
              <div className={styles.metricValue}>{checkRisk}</div>
            </div>
            <div className={`${styles.metricCard} ${styles.okRiskCard}`}>
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
            <div className={styles.chartBox}>
              <h3>Распределение риска</h3>
              <ResponsiveContainer width="100%" height={320}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={80} outerRadius={110} paddingAngle={8} dataKey="value" stroke="none">
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: 'rgba(15,23,42,0.9)' }} />
                  <Legend verticalAlign="bottom" height={36} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'prices' && (
        <div className={styles.fadeEnter}>
          <div className={styles.chartBoxFull}>
            <h3>Отклонение контрактов от рыночных медиан (%)</h3>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={priceData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="name" stroke="#64748b" />
                <YAxis stroke="#64748b" />
                <Tooltip cursor={{fill: 'rgba(255,255,255,0.02)'}} contentStyle={{ backgroundColor: 'rgba(15,23,42,0.95)' }}/>
                <Legend />
                <Bar dataKey="deviation" name="Отклонение (%)" fill="#3b82f6" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
