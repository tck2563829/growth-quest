import 'dotenv/config';
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const app = express();
const port = process.env.PORT || 10000;
const root = path.dirname(fileURLToPath(import.meta.url));
app.use(express.json({ limit: '32kb' }));

const categories = ['メンタル', '自信', '協調性', 'リーダーシップ'];
const speakers = ['村人A', '村人B', '村人C', '村長', '魔王'];
const jobStats = { リーダー: 'リーダーシップ', 鋼メンタル: 'メンタル', 自信人: '自信', 協力人: '協調性' };
const fallback = (note, job) => {
  const lower = note.toLowerCase();
  const clues = {
    メンタル: ['落ち着', '耐え', '失敗', '不安', '緊張', '我慢', '立て直', '冷静', 'めげず', '動じ'],
    自信: ['挑戦', '決め', '発表', '意見', 'できた', '成功', '行動', '頑張', '初めて'],
    協調性: ['友', '手伝', '相談', '聞い', '協力', '助け', '支え', 'チーム', '一緒'],
    リーダーシップ: ['まとめ', '率先', '声をかけ', '任せ', '引き受け', '指示', '企画', 'リード', '引っ張', 'リーダー']
  };
  const scores = categories.reduce((result, category) => {
    result[category] = clues[category].reduce((score, clue) => score + (lower.includes(clue) ? 1 : 0), 0);
    return result;
  }, {});
  const ranked = categories
    .map((category, index) => ({ category, score: scores[category], index }))
    .sort((a, b) => b.score - a.score || a.index - b.index);
  const primary = ranked[0].score > 0 ? ranked[0].category : (jobStats[job] || 'メンタル');
  const selected = ranked[0].score > 0 ? ranked.filter((item) => item.score > 0).slice(0, 2).map((item) => item.category) : [primary];
  const improvements = selected.map((category, index) => ({ category, scoreChange: Math.min(3, Math.max(1, scores[category] + (index === 0 ? 1 : 0))) }));
  const tips = {
    リーダー: '明日は小さな役割でもいいので、最初に声をかけてみよう。',
    鋼メンタル: '予想外のことが起きても、まず深呼吸してから一つだけ対処しよう。',
    自信人: '今日できたことを一つ言葉にして、自分の実績として残そう。',
    協力人: '誰かの困りごとに気づいたら、具体的な一言を添えて声をかけよう。'
  };
  const positive = 'いいじゃん！今日の一歩、ちゃんと成長につながってるぞ！';
  const nextAction = tips[job] || '明日も小さな一歩を積み重ねよう！';
  return { summary: '今日の行動から、前に進む力が見えたぞ！', progress: `${selected.join('と')}につながる行動、ばっちり実践できてる！`, tip: nextAction, positive, nextAction, speaker: '村長', reply: `${positive}\n${nextAction}`, category: primary, scoreChange: improvements[0].scoreChange, improvements };
};

app.post('/api/analyze', async (req, res) => {
  const { note, job, scores } = req.body || {};
  if (typeof note !== 'string' || !note.trim() || !Array.isArray(scores) || scores.length !== 4) {
    return res.status(400).json({ error: '今日の記録を入力してください。' });
  }
  if (!process.env.CLAUDE_API_KEY) return res.json(fallback(note.trim(), job));
  const prompt = `  あなたは自己成長ゲーム「成長クエスト」に登場する、元気な仲間たちです。医療診断や断定はせず、行動を温かく具体的に認めてください。返事は敬語を使わず、友だちに話すような元気なタメ口にしてください。
なりたい職業: ${job || '未選択'}
現在のステータス（メンタル、自信、協調性、リーダーシップ）: ${JSON.stringify(scores)}
今日の記録: ${note.trim()}
登場人物ごとの口調を守ってください。村人A/B/Cは明るく元気に、村長は頼もしく熱く、魔王は「フハハハ！」のような威厳ある魔王口調にしてください。ただし内容は必ず前向きで、ユーザーの成長を応援してください。
次のJSONだけを返してください。記録に複数の成長要素がある場合は、improvementsに関連するステータスを最大2種類まで入れてください。各scoreChangeは行動の具体性と成長度に応じた1から3までの整数にし、同じ値ばかりにせず内容に応じて1〜3を使い分けてください。小さな気づきは1、明確な実践は2、勇気のある挑戦や周囲への大きな貢献は3です。該当するステータスが1種類だけなら1種類だけにしてください。speakerは内容に合う登場人物を選んでください。
{"summary":"40字以内の要約","progress":"80字以内で伸びた理由","positive":"登場人物の口調で書いた内容を肯定する一言を60字以内で","nextAction":"登場人物の口調で次に試す具体的な行動を70字以内で","tip":"nextActionと同じ内容","reply":"positiveとnextActionを含む、登場人物からの元気な返事を120字以内で","speaker":"村人A|村人B|村人C|村長|魔王","improvements":[{"category":"メンタル|自信|協調性|リーダーシップ","scoreChange":1}],"category":"主に伸びたカテゴリ","scoreChange":1}`;
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': process.env.CLAUDE_API_KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({ model: process.env.CLAUDE_MODEL || 'claude-sonnet-4-5-20250929', max_tokens: 300, temperature: 0.3, messages: [{ role: 'user', content: prompt }] })
    });
    const payload = await response.json();
    if (!response.ok) return res.json(fallback(note.trim(), job));
    const text = payload.content?.find((item) => item.type === 'text')?.text || '';
    const result = JSON.parse(text.replace(/^```json\s*|\s*```$/g, '').trim());
    const improvements = Array.isArray(result.improvements)
      ? result.improvements.filter((item, index, list) => categories.includes(item?.category) && list.findIndex((candidate) => candidate?.category === item.category) === index).slice(0, 2).map((item) => ({ category: item.category, scoreChange: Math.max(1, Math.min(3, Math.round(Number(item.scoreChange) || 1))) }))
      : [];
    if (!improvements.length && categories.includes(result.category)) improvements.push({ category: result.category, scoreChange: Math.max(1, Math.min(3, Math.round(Number(result.scoreChange) || 1))) });
    if (!improvements.length) return res.json(fallback(note.trim(), job));
    const scoreChange = improvements[0].scoreChange;
    const speaker = speakers.includes(result.speaker) ? result.speaker : '村長';
    const positive = result.positive || result.progress;
    const nextAction = result.nextAction || result.tip;
    return res.json({ ...result, speaker, positive, nextAction, reply: result.reply || `${positive}\n${nextAction}`, category: improvements[0].category, scoreChange, improvements });
  } catch {
    return res.json(fallback(note.trim(), job));
  }
});

app.use(express.static(path.join(root, 'dist')));
app.get(/.*/, (_req, res) => res.sendFile(path.join(root, 'dist', 'index.html')));
app.listen(port, () => console.log(`growth-quest listening on ${port}`));
