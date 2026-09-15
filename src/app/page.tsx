'use client';

import { useState } from 'react';
import styles from './page.module.css';

export default function Home() {
  const [apiResponse, setApiResponse] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const testApi = async () => {
    setIsLoading(true);
    try {
      // Имитация задержки
      await new Promise(resolve => setTimeout(resolve, 800));
      
      const res = await fetch('https://github-activity-fake-api.onrender.com/api/test')
        .catch(() => null); // Подавляем ошибку, если фейковый бекенд не запущен
        
      if (res && res.ok) {
        const data = await res.json();
        setApiResponse(JSON.stringify(data, null, 2));
      } else {
        setApiResponse('{ "status": "success", "message": "Привет от фейкового бэкенда!", "data": [1, 2, 3] }\\n// (Имитация ответа, так как реальный сервер на Render может спать)');
      }
    } catch (err) {
      setApiResponse('Ошибка соединения с API');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.backgroundGlow} />
      <div className={styles.backgroundGlow2} />
      
      <main className={styles.glassCard}>
        <h1 className={styles.title}>Hackathon Korkyt</h1>
        <p className={styles.subtitle}>
          Аудит государственных закупок Казахстана. Мощный инструмент для аналитики, выявления фрагментации и бенчмаркинга цен.
        </p>
        
        <div className={styles.grid}>
          <div className={styles.card}>
            <h2 className={styles.cardTitle}>📊 Основной Дашборд</h2>
            <p className={styles.cardText}>
              Питоновский дашборд на Streamlit с реальными графиками и аналитикой, который крутится на Render.
            </p>
            <a 
              href="https://dashboard.render.com/" 
              target="_blank" 
              rel="noopener noreferrer"
              className={`${styles.button} ${styles.primaryButton}`}
            >
              Открыть Дашборд
            </a>
          </div>
          
          <div className={styles.card}>
            <h2 className={styles.cardTitle}>⚡ Тест API</h2>
            <p className={styles.cardText}>
              Проверка связи с фейковым Node.js бэкендом (твоё первое руководство).
            </p>
            <button 
              onClick={testApi} 
              className={`${styles.button} ${styles.secondaryButton}`}
              disabled={isLoading}
            >
              {isLoading ? 'Загрузка...' : 'Отправить запрос'}
            </button>
            {apiResponse && (
              <div className={styles.apiResult}>
                <pre>{apiResponse}</pre>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
