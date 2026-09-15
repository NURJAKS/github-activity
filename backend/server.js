const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();
// Render автоматически передаст свой порт через process.env.PORT
const PORT = process.env.PORT || 3000;

// Настройка CORS (чтобы твой фронтенд на Vercel не блокировался)
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*'); 
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  next();
});

// Утилита для безопасного чтения JSON
const loadJson = (filename) => {
  try {
    const filePath = path.join(__dirname, 'data', filename);
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    }
  } catch (error) {
    console.error(`Error reading ${filename}:`, error);
  }
  return null;
};

// Константы для порогов рисков
const RISK_OK = "норма", RISK_CHECK = "требует проверки", RISK_HIGH = "высокий риск";
const RISK_ORDER = { [RISK_OK]: 0, [RISK_CHECK]: 1, [RISK_HIGH]: 2 };

const priceComponent = (b) => {
  if (!b || ![RISK_OK, RISK_CHECK, RISK_HIGH].includes(b.risk_level)) return RISK_OK;
  return b.risk_level;
};

const fragComponent = (cluster) => {
  if (!cluster) return RISK_OK;
  const s = cluster.suspicion_score || 0;
  return s >= 70 ? RISK_HIGH : (s >= 40 ? RISK_CHECK : RISK_OK);
};

const integrityComponent = (rec) => {
  if (!rec || rec.integrity_score === undefined) return RISK_OK;
  const s = rec.integrity_score;
  return s < 50 ? RISK_HIGH : (s < 80 ? RISK_CHECK : RISK_OK);
};

const torComponent = (rec) => {
  if (!rec || rec.consistency_score === undefined) return RISK_OK;
  const s = rec.consistency_score;
  return s < 50 ? RISK_HIGH : (s < 80 ? RISK_CHECK : RISK_OK);
};

// API Endpoint: Возвращает агрегированные данные для дашборда
app.get('/api/dashboard-data', (req, res) => {
  const raw = {
    contracts: loadJson('contracts.json'),
    alternatives: loadJson('alternatives.json'),
    price_benchmark: loadJson('price_benchmark.json'),
    category_stats: loadJson('category_stats.json'),
    tor_compliance: loadJson('tor_compliance.json'),
    fragmentation_clusters: loadJson('fragmentation_clusters.json'),
    integrity_check: loadJson('integrity_check.json')
  };

  const byFile = (key) => {
    const data = raw[key] || [];
    const map = {};
    data.forEach(r => {
      if (r.source_file) map[r.source_file] = r;
    });
    return map;
  };

  const alts = byFile("alternatives");
  const bench = byFile("price_benchmark");
  const comp = byFile("tor_compliance");
  const integ = byFile("integrity_check");

  // Дробление (берем самый подозрительный кластер для каждого файла)
  const frag = {};
  (raw.fragmentation_clusters || []).forEach(cl => {
    (cl.source_files || []).forEach(sf => {
      if (!frag[sf] || cl.suspicion_score > frag[sf].suspicion_score) {
        frag[sf] = cl;
      }
    });
  });

  const merged = [];
  (raw.contracts || []).forEach(c => {
    const sf = c.source_file || "";
    const parts = {
      price: priceComponent(bench[sf]),
      fragmentation: fragComponent(frag[sf]),
      integrity: integrityComponent(integ[sf]),
      tor: torComponent(comp[sf])
    };
    
    // Находим максимальный риск
    let overall = RISK_OK;
    Object.values(parts).forEach(lvl => {
      if (RISK_ORDER[lvl] > RISK_ORDER[overall]) overall = lvl;
    });

    const reasons = [];
    if (parts.price !== RISK_OK) reasons.push("цена");
    if (parts.fragmentation !== RISK_OK) reasons.push("дробление");
    if (parts.tor !== RISK_OK) reasons.push("ТЗ");
    if (parts.integrity !== RISK_OK) reasons.push("PDF");

    merged.push({
      source_file: sf,
      contract: c,
      alternatives: alts[sf],
      benchmark: bench[sf],
      compliance: comp[sf],
      cluster: frag[sf],
      integrity: integ[sf],
      components: parts,
      risk_level: overall,
      reasons: reasons
    });
  });

  res.json({
    status: 'success',
    data: {
      merged: merged,
      category_stats: raw.category_stats,
      clusters: raw.fragmentation_clusters
    }
  });
});

// Главная страница бэкенда
app.get('/', (req, res) => {
  res.send('Бэкенд успешно запущен на Render!');
});

app.listen(PORT, () => {
  console.log(`Fake server is running on port ${PORT}`);
});
