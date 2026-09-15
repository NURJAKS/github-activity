'use client';

import React, { useEffect, useState, useRef } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, 
  CartesianGrid, Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis 
} from 'recharts';
import { 
  ShieldAlert, CheckCircle, AlertTriangle, FileText, Activity, 
  TrendingDown, TrendingUp, DollarSign, Layers, FileSearch, 
  UploadCloud, MonitorOff, Scissors, FileWarning, Search, Network
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

export default function Dashboard() {
  const [data, setData] = useState<MergedData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'summary' | 'prices' | 'upload'>('summary');

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

  // Подготовка данных для Radar Chart на основе Mock результатов
  let radarData = [];
  if (analysisResult) {
    radarData = analysisResult.findings.map(f => {
      let score = 20; // норма
      if (f.risk === 'высокий риск') score = 100;
      if (f.risk === 'требует проверки') score = 60;
      
      let shortName = f.category;
      if (shortName.includes("ИТ-разработка")) shortName = "ТЗ (ИТ)";
      if (shortName.includes("Анализ Цен")) shortName = "Цены";
      if (shortName.includes("Альтернативы")) shortName = "Аналоги";
      if (shortName.includes("Дробление")) shortName = "Дробление";
      if (shortName.includes("Целостность")) shortName = "Подделка PDF";

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
                accept=".pdf,.doc,.docx" 
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
                  <p>Или нажмите для выбора файла (Кейс: ИТ-услуги, Дробление)</p>
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
                <h2>Результаты аудита: {analysisResult.filename}</h2>
                <div className={`${styles.badge} ${styles.high}`}>Общий риск: Высокий</div>
              </div>

              <div className={styles.resultContent}>
                <div className={styles.radarContainer}>
                  <h3 style={{color: "#e2e8f0", textAlign: "center", marginBottom: "1rem"}}><Network size={20} style={{verticalAlign: "middle", marginRight: 8}}/> Вектор Рисков (Граф)</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                      <PolarGrid stroke="rgba(255,255,255,0.1)" />
                      <PolarAngleAxis dataKey="subject" tick={{fill: '#94a3b8', fontSize: 12}} />
                      <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                      <Radar name="Риск" dataKey="A" stroke="#ff4b4b" fill="#ff4b4b" fillOpacity={0.4} />
                      <Tooltip contentStyle={{ backgroundColor: 'rgba(15,23,42,0.9)', border: '1px solid rgba(255,255,255,0.1)' }}/>
                    </RadarChart>
                  </ResponsiveContainer>
                  <p className={styles.radarCaption}>Чем больше площадь, тем выше комплексный коррупционный риск документа.</p>
                </div>

                <div className={styles.findingsGridVertical}>
                  {analysisResult.findings.map((f, i) => (
                    <div key={i} className={styles.findingCard}>
                      <div className={`${styles.findingIconBox} ${f.risk === 'высокий риск' ? styles.bgRed : styles.bgWarn}`}>
                        {getIcon(f.icon)}
                      </div>
                      <div className={styles.findingContent}>
                        <span className={styles.findingCategory}>{f.category}</span>
                        <h4>{f.title}</h4>
                        <p>{f.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

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
                    <h4>Завышение цен на ИТ</h4>
                    <p>Контракты с фиктивной разработкой ПО и оплатой за 'готовый товар'.</p>
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
                  <div className={styles.signalIcon} style={{background: 'rgba(139, 92, 246, 0.2)', color: '#8b5cf6'}}><FileWarning /></div>
                  <div className={styles.signalInfo}>
                    <h4>Изменение PDF</h4>
                    <p>Следы редакторов (Illustrator) в оригинальных договорах.</p>
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
