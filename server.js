import 'dotenv/config';
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const app = express();
const port = process.env.PORT || 10000;
const root = path.dirname(fileURLToPath(import.meta.url));
app.use(express.json({ limit: '32kb' }));

const categories = ['メンタル', '自信', '協調性', 'リーダーシップ'];
const fallback = (note, job) => {
  const lower = note.toLowerCase();
  const category = lower.includes('友') || lower.includes('手伝') || lower.includes('相談') ? '協調性'
    : lower.includes('挑戦') || lower.includes('決め') || lower.includes('発表') ? '自信'
    : lower.includes('落ち着') || lower.includes('耐') || lower.includes('失敗') ? 'メンタル'
    : 'リーダーシップ';
  const tips = {
    リーダー: '明日は小さな役割でもいいので、最初に声をかけてみよう。',
    鋼メンタル: '予想外のことが起きても、まず深呼吸してから一つだけ対処しよう。',
    自信人: '今日できたことを一つ言葉にして、自分の実績として残そう。',
    協力人: '誰かの困りごとに気づいたら、具体的な一言を添えて声をかけよう。'
  };
  return { summary: '今日の行動から、前に進む力が見えました。', progress: `${category}につながる行動を実践できています。`, tip: tips[job] || '明日も小さな一歩を積み重ねよう。', category, scoreChange: 3 };
};

app.post('/api/analyze', async (req, res) => {
  const { note, job, scores } = req.body || {};
  if (typeof note !== 'string' || !note.trim() || !Array.isArray(scores) || scores.length !== 4) {
    return res.status(400).json({ error: '今日の記録を入力してください。' });
  }
  if (!process.env.CLAUDE_API_KEY) return res.json(fallback(note.trim(), job));
  const prompt = `あなたは自己成長ゲーム「成長クエスト」の伴走者です。医療診断や断定はせず、行動を温かく具体的に認めてください。
なりたい職業: ${job || '未選択'}
現在のステータス（メンタル、自信、協調性、リーダーシップ）: ${JSON.stringify(scores)}
今日の記録: ${note.trim()}
次のJSONだけを返してください。categoryは4カテゴリのいずれか、scoreChangeは必ず3にしてください。
{"summary":"40字以内の要約","progress":"80字以内で伸びた理由","tip":"選んだ職業に近づく明日の具体的な行動を70字以内","category":"メンタル|自信|協調性|リーダーシップ","scoreChange":3}`;
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': process.env.CLAUDE_API_KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({ model: process.env.CLAUDE_MODEL || 'claude-sonnet-4-5-20250929', max_tokens: 300, temperature: 0.3, messages: [{ role: 'user', content: prompt }] })
    });
    const payload = await response.json();
    if (!response.ok) return res.status(502).json({ error: payload.error?.message || 'Claude APIに接続できませんでした。' });
    const text = payload.content?.find((item) => item.type === 'text')?.text || '';
    const result = JSON.parse(text.replace(/^```json\s*|\s*```$/g, '').trim());
    if (!categories.includes(result.category)) throw new Error('Invalid category');
    return res.json({ ...result, scoreChange: 3 });
  } catch {
    return res.status(502).json({ error: 'AI分析の結果を読み取れませんでした。もう一度お試しください。' });
  }
});

app.use(express.static(path.join(root, 'dist')));
app.get(/.*/, (_req, res) => res.sendFile(path.join(root, 'dist', 'index.html')));
app.listen(port, () => console.log(`growth-quest listening on ${port}`));
