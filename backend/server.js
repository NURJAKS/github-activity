const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const OpenAI = require('openai');
const pdfParse = require('pdf-parse');

const app = express();
const PORT = process.env.PORT || 3000;

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Настройка multer для приема файлов (в память)
const upload = multer({ storage: multer.memoryStorage() });

// Настройка CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*'); 
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
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

// -------------------------------------------------------------
// РЕАЛЬНЫЙ ИИ-АНАЛИЗ ЗАГРУЖЕННОГО ДОГОВОРА ЧЕРЕЗ OPENAI
// -------------------------------------------------------------
app.post('/api/analyze', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Файл не найден' });
  }

  // Исправляем кодировку имени файла (multer часто читает utf-8 как latin1)
  const filename = Buffer.from(req.file.originalname, 'latin1').toString('utf8');
  
  try {
    let text = "";
    if (filename.toLowerCase().endsWith('.pdf')) {
      const data = await pdfParse(req.file.buffer);
      text = data.text;
    } else {
      // Для txt/docx попытаемся прочесть как строку (базово)
      text = req.file.buffer.toString('utf8');
    }

    // Ограничиваем длину текста, чтобы не выйти за лимиты токенов GPT
    text = text.substring(0, 15000);

    const prompt = `
Ты - строгий ИИ-аудитор госзакупок Казахстана. 
Твоя задача - проанализировать предоставленный текст договора и выявить коррупционные риски.
Ищи следующие маркеры:
1. Фиктивная ИТ-разработка (завышение цены, разработка без тех. смысла, оплата за "готовый товар" вместо реальной разработки).
2. Аномальное отклонение цены (завышена ли цена по рынку).
3. Наличие дешевых аналогов (можно ли было купить готовое SaaS решение вместо заказной разработки).
4. Дробление закупок (есть ли признаки намеренного дробления бюджета, чтобы обойти конкурсные процедуры).
5. Специфичное ТЗ (нет ли сговора под конкретного поставщика).

ОБЯЗАТЕЛЬНО ВЕРНИ ОТВЕТ СТРОГО В ФОРМАТЕ JSON, без блоков кода (\`\`\`). Формат:
{
  "filename": "${filename}",
  "overall_risk": "высокий риск" или "требует проверки" или "норма",
  "findings": [
    {
      "category": "ИТ-разработка (Тех. Спецификация)" или "Анализ Цен (Завышение)" или "Альтернативы на рынке" или "Дробление закупок" или "Целостность ТЗ",
      "risk": "высокий риск" или "требует проверки" или "норма",
      "title": "Краткий заголовок проблемы",
      "description": "Детальное описание того, что ты нашел в тексте.",
      "icon": "MonitorOff" или "TrendingUp" или "Layers" или "Scissors" или "FileWarning"
    }
  ]
}
Обязательно включи от 3 до 5 объектов в массив findings на основе текста. 

Текст документа:
${text}
    `;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "system", content: prompt }],
      temperature: 0.1,
    });

    const aiContent = completion.choices[0].message.content.trim();
    
    // Очистка от возможных маркдаун-блоков ```json
    const jsonStr = aiContent.replace(/^```json/gi, '').replace(/```$/g, '').trim();
    const result = JSON.parse(jsonStr);

    res.json({
      status: 'success',
      data: result
    });
  } catch (error) {
    console.error("AI Analysis Error:", error);
    res.status(500).json({ error: "Ошибка при анализе файла ИИ: " + error.message });
  }
});

// -------------------------------------------------------------
// ЭНДПОИНТ: СТАРЫЕ ДАННЫЕ ДАШБОРДА
// -------------------------------------------------------------
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
      source_file: sf, contract: c, alternatives: alts[sf], benchmark: bench[sf],
      compliance: comp[sf], cluster: frag[sf], integrity: integ[sf],
      components: parts, risk_level: overall, reasons: reasons
    });
  });

  res.json({
    status: 'success',
    data: { merged, category_stats: raw.category_stats, clusters: raw.fragmentation_clusters }
  });
});

app.get('/', (req, res) => {
  res.send('API Audit Backend is running with OpenAI integration!');
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
