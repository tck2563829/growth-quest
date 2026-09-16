import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { BookOpen, ChevronRight, CircleUserRound, Flame, Home, LogOut, RotateCcw, Sparkles, Swords, Trophy } from 'lucide-react';
import './styles.css';

if ('serviceWorker' in navigator) window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js'));

const JOBS = [
  { id: '無職', icon: 'NONE', catch: 'まだ何者でもない。ここから冒険が始まる', color: '#9ca27e', stat: null },
  { id: 'リーダー', icon: 'LEAD', catch: '周りを引っ張れる、カリスマのある存在', color: '#f4cf54', stat: 'リーダーシップ' },
  { id: '鋼メンタル', icon: 'IRON', catch: '並大抵のことでは動じない持ち主', color: '#72c6d0', stat: 'メンタル' },
  { id: '自信人', icon: 'BOLD', catch: '圧倒的自信で、いつでも頼れる存在', color: '#ef8066', stat: '自信' },
  { id: '協力人', icon: 'ALLY', catch: '周りをよく見て、支えるのが得意', color: '#a7d765', stat: '協調性' },
  { id: '最強', icon: 'MAX', catch: 'すべての力を極めた、究極の冒険者', color: '#ffef8a', stat: null }
];
const STATS = ['メンタル', '自信', '協調性', 'リーダーシップ', '継続力'];
const AI_STATS = STATS.filter((name) => name !== '継続力');
const getJobForStats = (stats) => {
  if (STATS.every((stat) => Number(stats[stat] || 0) === 0)) return '無職';
  if (STATS.every((stat) => Number(stats[stat] || 0) === 100)) return '最強';
  const statToJob = Object.fromEntries(JOBS.filter((item) => item.stat).map((item) => [item.stat, item.id]));
  const bestStat = AI_STATS.reduce((best, stat) => stats[stat] > stats[best] ? stat : best, AI_STATS[0]);
  return statToJob[bestStat] || '無職';
};
const QUESTIONS = [
  ['緊張する場面でも、まず落ち着いて考えられる', 'メンタル'],
  ['自分の考えや選択を、胸を張って伝えられる', '自信'],
  ['誰かが困っていると、自然に声をかけられる', '協調性'],
  ['みんなをまとめて、最初の一歩を踏み出せる', 'リーダーシップ'],
  ['失敗しても、次にできることを探せる', 'メンタル'],
  ['自分の得意なことを、素直に認められる', '自信'],
  ['相手の話を最後まで聞いてから行動できる', '協調性'],
  ['目標に向けて、周りに呼びかけられる', 'リーダーシップ']
];
const emptyState = { job: null, stats: { メンタル: 0, 自信: 0, 協調性: 0, リーダーシップ: 0, 継続力: 0 }, points: 0, level: 1, logs: [], user: null, profiles: {}, lastAdventureDate: null };
const loadState = () => {
  try {
    const saved = JSON.parse(localStorage.getItem('growth-quest') || '{}');
    return { ...emptyState, ...saved, stats: { ...emptyState.stats, ...(saved.stats || {}) } };
  } catch { return emptyState; }
};
const getProgress = (experience) => {
  let level = 1;
  let earnedForLevel = 0;
  let required = 3;
  while (experience - earnedForLevel >= required) {
    earnedForLevel += required;
    level += 1;
    required += 1;
  }
  return { level, current: experience - earnedForLevel, required };
};

function StatBars({ stats, points }) {
  return <div className="stats-grid">{STATS.map((name) => <div className="stat" key={name}><div className="stat-label"><span>{name}</span><b>{stats[name]}</b></div><div className="bar"><i style={{ width: `${Math.min(100, stats[name])}%` }} /></div></div>)}</div>;
}

function App() {
  const [state, setState] = useState(loadState);
  const [screen, setScreen] = useState(() => loadState().job ? 'home' : 'quiz');
  const [answers, setAnswers] = useState({});
  const [loginMode, setLoginMode] = useState('login');
  const [form, setForm] = useState({ email: '', password: '' });
  const [note, setNote] = useState('');
  const [analysis, setAnalysis] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (state.user?.mode === 'member') localStorage.setItem('growth-quest', JSON.stringify(state)); }, [state]);
  const job = useMemo(() => JOBS.find((item) => item.id === state.job), [state.job]);
  const progression = getProgress(state.points);
  const retakeQuestionnaire = () => { setAnswers({}); setScreen('quiz'); };
  const finishQuiz = () => {
    const stats = { ...emptyState.stats };
    Object.entries(answers).forEach(([index, value]) => { const category = QUESTIONS[index][1]; stats[category] += (Number(value) - 1) * 5; });
    const initialJob = getJobForStats(stats);
    setState((s) => ({ ...s, job: initialJob, stats, points: 0, level: 1, logs: [], lastAdventureDate: null, profiles: { ...s.profiles, [initialJob]: { stats, points: 0, level: 1, logs: [], lastAdventureDate: null } } }));
    setScreen('login');
  };
  const login = (event) => {
    event.preventDefault();
    if (!form.email || !form.password) return;
    setState((s) => ({ ...s, user: { email: form.email, mode: 'member' } }));
    setScreen('home');
  };
  const continueAsGuest = () => { localStorage.removeItem('growth-quest'); setState((s) => ({ ...s, user: { mode: 'guest' } })); setScreen('home'); };
  const analyze = async (event) => {
    event.preventDefault();
    if (!note.trim()) return;
    setBusy(true); setAnalysis(null);
    try {
      const response = await fetch('/api/analyze', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ note, job: state.job, scores: AI_STATS.map((name) => state.stats[name]) }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || '分析に失敗しました');
      const category = AI_STATS.includes(result.category) ? result.category : job?.stat || AI_STATS[0];
      const scoreChange = Math.max(1, Math.min(3, Math.round(Number(result.scoreChange) || 1)));
      const stats = { ...state.stats, [category]: Math.min(100, state.stats[category] + scoreChange) };
      const today = new Date().toLocaleDateString('sv-SE');
      const continuityChange = state.lastAdventureDate === today ? 0 : 1;
      stats.継続力 = Math.min(100, stats.継続力 + continuityChange);
      const points = state.points + scoreChange;
      const nextProgression = getProgress(points);
      const nextJob = getJobForStats(stats);
      const changedJob = nextJob !== state.job;
      const logs = [{ date: new Date().toLocaleDateString('ja-JP'), note, category, scoreChange, continuityChange, tip: result.tip, positive: result.positive, nextAction: result.nextAction, reply: result.reply, progress: result.progress, speaker: result.speaker }, ...state.logs].slice(0, 20);
      const profiles = { ...state.profiles, [state.job]: { stats, points, level: nextProgression.level, logs, lastAdventureDate: today }, [nextJob]: { stats, points, level: nextProgression.level, logs, lastAdventureDate: today } };
      setState((s) => ({ ...s, job: nextJob, stats, points, level: nextProgression.level, logs, profiles, lastAdventureDate: today }));
      setAnalysis({ ...result, category, scoreChange, nextLevel: nextProgression.level, leveled: nextProgression.level > getProgress(state.points).level, changedJob, nextJob });
      setNote('');
    } catch (error) { setAnalysis({ error: error.message }); }
    finally { setBusy(false); }
  };
  const logout = () => { setState((s) => ({ ...s, user: null })); setScreen('login'); };
  const navigate = (target) => setScreen(target);

  return <div className="app-shell">
    <header className="topbar"><div className="brand" onClick={() => state.job && setScreen('home')}><span className="brand-mark">✦</span><span>成長クエスト</span></div>{state.user && <button className="icon-button" onClick={logout} title="ログアウト"><LogOut size={18} /></button>}</header>
    <main>
      {screen === 'jobs' && <section className="screen hero-screen"><div className="battle-scene"><div className="sun" /><div className="pixel-cloud cloud-one" /><div className="pixel-cloud cloud-two" /><div className="mountain" /><div className="dragon-silhouette" /><div className="party-silhouette"><i /><i /><i /></div></div><div className="command-window intro-command"><span className="command-caret">▶</span> 職業一覧</div><p className="lead intro-lead">これまでに就いた職業だけが表示されています。</p><div className="job-grid">{JOBS.filter((item) => state.profiles?.[item.id]).map((item) => <button className="job-card job-card-readonly" style={{ '--accent': item.color }} key={item.id} type="button"><span className="job-icon">{item.icon}</span><span className="job-name">{item.id}</span><span className="job-catch">{item.catch}</span><span className="choose">到達済み</span></button>)}</div><button className="primary wide questionnaire-again" onClick={retakeQuestionnaire}>アンケートを受け直す <ChevronRight size={18} /></button></section>}
      {screen === 'quiz' && <section className="screen narrow"><p className="eyebrow">INITIAL STATUS</p><h2>冒険前のステータスを<br />チェックしよう</h2><p className="muted">今のあなたに近い答えを選んでください。</p><div className="quiz-list">{QUESTIONS.map(([question], index) => <div className="question" key={question}><p><span>{String(index + 1).padStart(2, '0')}</span>{question}</p><div className="choices">{[1, 2, 3, 4, 5].map((value) => <button className={answers[index] === value ? 'selected' : ''} onClick={() => setAnswers((a) => ({ ...a, [index]: value }))} key={value}>{value === 1 ? '全然ちがう' : value === 5 ? 'とてもそう' : value}</button>)}</div></div>)}</div><button className="primary wide" disabled={Object.keys(answers).length !== QUESTIONS.length} onClick={finishQuiz}>ステータスを決定する <ChevronRight size={18} /></button></section>}
      {screen === 'login' && <section className="screen narrow login-screen"><div className="quest-badge"><CircleUserRound size={28} /></div><p className="eyebrow">SAVE YOUR ADVENTURE</p><h2>冒険の記録を<br />保存しよう</h2><p className="muted">ログインすると成長ログを保存できます。ゲストは保存せずに遊べます。</p><form onSubmit={login} className="login-form"><label>メールアドレス<input type="email" placeholder="you@example.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required /></label><label>パスワード<input type="password" placeholder="6文字以上" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required minLength="6" /></label><button className="primary wide">{loginMode === 'login' ? 'ログインして保存する' : 'アカウントを作成'} <ChevronRight size={18} /></button></form><button className="guest-button" onClick={continueAsGuest}>ゲストとして遊ぶ（保存なし）</button><button className="text-button" onClick={() => setLoginMode(loginMode === 'login' ? 'signup' : 'login')}>{loginMode === 'login' ? 'はじめての方はこちら' : 'ログインはこちら'}</button><small>ゲストの進捗は、このブラウザを閉じると保存されません。</small></section>}
      {screen === 'home' && <section className="screen dashboard"><div className="dashboard-head"><div><p className="eyebrow">ADVENTURE STATUS</p><h2>おかえりなさい、<br /><em>{job?.id}</em>の冒険者。</h2></div><div className="level-orb"><span>LV</span><b>{progression.level}</b></div></div><div className="xp-row"><span>つぎのレベルまで</span><b>{progression.current}/{progression.required} EXP</b></div><div className="xp-bar"><i style={{ width: `${progression.current / progression.required * 100}%` }} /></div><div className="panel"><div className="panel-title"><span><Swords size={17} />ステータス</span><span className="job-chip" style={{ color: job?.color }}>{job?.icon} / {job?.id}</span></div><StatBars stats={state.stats} points={state.points} /></div><button className="quest-card" onClick={() => setScreen('log')}><span className="quest-icon">LOG</span><span><b>冒険の書</b><small>今日あったことを書いて、経験値を手に入れよう</small></span><ChevronRight /></button><div className="home-links"><button onClick={() => setScreen('history')}><BookOpen size={18} />成長のきろく <span>{state.logs.length}</span></button><button onClick={retakeQuestionnaire}><Sparkles size={18} />職業を選び直す</button></div></section>}
      {screen === 'log' && <section className="screen narrow"><button className="back" onClick={() => setScreen('home')}>▶ ホームへ戻る</button><p className="eyebrow">ADVENTURE LOG</p><h2>冒険の書を<br />記入しよう。</h2><p className="muted">今日あったことを書いて、あなたの成長を記録しよう。</p><form onSubmit={analyze}><textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="例：会議で自分から意見を言えた。帰りに友だちの相談を聞いた。" maxLength="1000" /><div className="textarea-foot"><span>{note.length}/1000</span><button className="primary" disabled={busy || !note.trim()}>{busy ? '分析中…' : '冒険の書を記録する'} <Sparkles size={16} /></button></div></form>{analysis && <div className={`result ${analysis.error ? 'error' : ''}`}>{analysis.error ? <p>{analysis.error}</p> : <><div className="speaker-box"><b>{analysis.speaker || '村長'}</b><span>{analysis.positive || analysis.progress}</span></div>{analysis.changedJob && <div className="job-change"><span className="job-change-caret">★</span><strong>{analysis.nextJob}に転職した！</strong><small>ステータスの変化で、新しい職業にたどり着いたぞ！</small></div>}<div className="result-pop"><span className="command-caret">▶</span> {analysis.category} のステータスがあがった！ <b>+{analysis.scoreChange}</b></div><p>{analysis.progress}</p><div className="tip"><Trophy size={18} /><span><b>次はこれをしよう</b>{analysis.nextAction || analysis.tip}</span></div>{analysis.leveled && <div className="level-up">LEVEL UP! あなたは LV.{analysis.nextLevel} になった！</div>}<button className="primary wide" onClick={() => setScreen('home')}>ホームで確認する</button></>}</div>}</section>}
      {screen === 'history' && <section className="screen narrow"><button className="back" onClick={() => setScreen('home')}>← ホームへ戻る</button><p className="eyebrow">ADVENTURE LOG</p><h2>成長のきろく</h2><div className="history-list">{state.logs.length ? state.logs.map((log, index) => <article key={`${log.date}-${index}`}><div className="log-date">{log.date}<b>+{log.scoreChange || 1} {log.category}{log.continuityChange ? ` / 継続力 +${log.continuityChange}` : ''}</b></div><p className="log-note">{log.note}</p><div className="log-reply"><strong>{log.speaker || '村長'}</strong><span>{log.reply || `${log.positive || '今日の一歩、いい感じ！'}\n${log.nextAction || log.tip}`}</span></div></article>) : <div className="empty"><BookOpen size={30} /><p>まだ冒険の記録がありません。<br />冒険の書を記入しよう。</p></div>}</div></section>}
    </main>
    {state.job && !['quiz', 'login'].includes(screen) && <nav className="bottom-nav"><button className={screen === 'home' ? 'active' : ''} onClick={() => navigate('home')}><Home size={17} />ホーム</button><button className={screen === 'history' ? 'active' : ''} onClick={() => navigate('history')}><BookOpen size={17} />成長の記録</button><button className={screen === 'log' ? 'active' : ''} onClick={() => navigate('log')}><Sparkles size={17} />冒険の書</button><button className={screen === 'jobs' ? 'active' : ''} onClick={() => navigate('jobs')}><RotateCcw size={17} />職業一覧</button></nav>}
    <footer><span>成長クエスト</span><span>自分を育てる、毎日が冒険。</span></footer>
  </div>;
}

createRoot(document.getElementById('root')).render(<App />);
