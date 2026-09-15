import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { BookOpen, ChevronRight, CircleUserRound, Flame, LogOut, Sparkles, Swords, Trophy } from 'lucide-react';
import './styles.css';

const JOBS = [
  { id: 'リーダー', icon: '👑', catch: '周りを引っ張れる、カリスマのある存在', color: '#ffbd59', stat: 'リーダーシップ' },
  { id: '鋼メンタル', icon: '🛡️', catch: '並大抵のことでは動じない持ち主', color: '#8db5ff', stat: 'メンタル' },
  { id: '自信人', icon: '⚔️', catch: '圧倒的自信で、いつでも頼れる存在', color: '#ff8e9e', stat: '自信' },
  { id: '協力人', icon: '🤝', catch: '周りをよく見て、支えるのが得意', color: '#83e0b0', stat: '協調性' }
];
const STATS = ['メンタル', '自信', '協調性', 'リーダーシップ'];
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
const emptyState = { job: null, stats: { メンタル: 0, 自信: 0, 協調性: 0, リーダーシップ: 0 }, points: 0, level: 1, logs: [], user: null };
const loadState = () => { try { return { ...emptyState, ...JSON.parse(localStorage.getItem('growth-quest') || '{}') }; } catch { return emptyState; } };

function StatBars({ stats, points }) {
  return <div className="stats-grid">{STATS.map((name) => <div className="stat" key={name}><div className="stat-label"><span>{name}</span><b>{stats[name]}</b></div><div className="bar"><i style={{ width: `${Math.min(100, stats[name])}%` }} /></div></div>)}</div>;
}

function App() {
  const [state, setState] = useState(loadState);
  const [screen, setScreen] = useState(() => loadState().job ? 'home' : 'jobs');
  const [answers, setAnswers] = useState({});
  const [loginMode, setLoginMode] = useState('login');
  const [form, setForm] = useState({ email: '', password: '' });
  const [note, setNote] = useState('');
  const [analysis, setAnalysis] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => localStorage.setItem('growth-quest', JSON.stringify(state)), [state]);
  const job = useMemo(() => JOBS.find((item) => item.id === state.job), [state.job]);
  const nextLevel = state.level * 3;
  const selectJob = (id) => { setState((s) => ({ ...s, job: id })); setScreen('quiz'); };
  const finishQuiz = () => {
    const stats = { ...emptyState.stats };
    Object.entries(answers).forEach(([index, value]) => { const category = QUESTIONS[index][1]; stats[category] += Number(value) * 5; });
    setState((s) => ({ ...s, stats, points: 0, level: 1 }));
    setScreen('login');
  };
  const login = (event) => {
    event.preventDefault();
    if (!form.email || !form.password) return;
    setState((s) => ({ ...s, user: { email: form.email } }));
    setScreen('home');
  };
  const analyze = async (event) => {
    event.preventDefault();
    if (!note.trim()) return;
    setBusy(true); setAnalysis(null);
    try {
      const response = await fetch('/api/analyze', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ note, job: state.job, scores: STATS.map((name) => state.stats[name]) }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || '分析に失敗しました');
      const category = STATS.includes(result.category) ? result.category : job.stat;
      const stats = { ...state.stats, [category]: Math.min(100, state.stats[category] + 3) };
      const points = state.points + 3;
      setState((s) => ({ ...s, stats, points, level: Math.floor(points / 3) + 1, logs: [{ date: new Date().toLocaleDateString('ja-JP'), note, category, tip: result.tip }, ...s.logs].slice(0, 20) }));
      setAnalysis({ ...result, category, leveled: points % 3 === 0 });
      setNote('');
    } catch (error) { setAnalysis({ error: error.message }); }
    finally { setBusy(false); }
  };
  const logout = () => { setState((s) => ({ ...s, user: null })); setScreen('login'); };

  return <div className="app-shell">
    <header className="topbar"><div className="brand" onClick={() => state.job && setScreen('home')}><span className="brand-mark">✦</span><span>成長クエスト</span></div>{state.user && <button className="icon-button" onClick={logout} title="ログアウト"><LogOut size={18} /></button>}</header>
    <main>
      {screen === 'jobs' && <section className="screen hero-screen"><p className="eyebrow">YOUR NEXT ADVENTURE</p><h1>なりたい自分を、<br /><em>選ぼう。</em></h1><p className="lead">あなたの毎日を冒険に変える、<br />自己分析RPGへようこそ。</p><div className="job-grid">{JOBS.map((item) => <button className="job-card" style={{ '--accent': item.color }} key={item.id} onClick={() => selectJob(item.id)}><span className="job-icon">{item.icon}</span><span className="job-name">{item.id}</span><span className="job-catch">{item.catch}</span><span className="choose">この職業を選ぶ <ChevronRight size={15} /></span></button>)}</div></section>}
      {screen === 'quiz' && <section className="screen narrow"><p className="eyebrow">INITIAL STATUS</p><h2>冒険前のステータスを<br />チェックしよう</h2><p className="muted">今のあなたに近い答えを選んでください。</p><div className="quiz-list">{QUESTIONS.map(([question], index) => <div className="question" key={question}><p><span>{String(index + 1).padStart(2, '0')}</span>{question}</p><div className="choices">{[1, 2, 3, 4, 5].map((value) => <button className={answers[index] === value ? 'selected' : ''} onClick={() => setAnswers((a) => ({ ...a, [index]: value }))} key={value}>{value === 1 ? '全然ちがう' : value === 5 ? 'とてもそう' : value}</button>)}</div></div>)}</div><button className="primary wide" disabled={Object.keys(answers).length !== QUESTIONS.length} onClick={finishQuiz}>ステータスを決定する <ChevronRight size={18} /></button></section>}
      {screen === 'login' && <section className="screen narrow login-screen"><div className="quest-badge"><CircleUserRound size={28} /></div><p className="eyebrow">SAVE YOUR ADVENTURE</p><h2>冒険の記録を<br />保存しよう</h2><p className="muted">ログインすると、成長ログをいつでも振り返れます。</p><form onSubmit={login} className="login-form"><label>メールアドレス<input type="email" placeholder="you@example.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required /></label><label>パスワード<input type="password" placeholder="6文字以上" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required minLength="6" /></label><button className="primary wide">{loginMode === 'login' ? 'ログインして続ける' : 'アカウントを作成'} <ChevronRight size={18} /></button></form><button className="text-button" onClick={() => setLoginMode(loginMode === 'login' ? 'signup' : 'login')}>{loginMode === 'login' ? 'はじめての方はこちら' : 'ログインはこちら'}</button><small>現在はデモログインです。公開時はSupabase Authを接続できます。</small></section>}
      {screen === 'home' && <section className="screen dashboard"><div className="dashboard-head"><div><p className="eyebrow">TODAY'S QUEST</p><h2>おかえりなさい、<br /><em>{job?.id}</em>の冒険者。</h2></div><div className="level-orb"><span>LV</span><b>{state.level}</b></div></div><div className="xp-row"><span>次のレベルまで</span><b>{state.points % 3}/3 pt</b></div><div className="xp-bar"><i style={{ width: `${(state.points % 3) * 33.33}%` }} /></div><div className="panel"><div className="panel-title"><span><Swords size={17} />現在のステータス</span><span className="job-chip" style={{ color: job?.color }}>{job?.icon} {job?.id}</span></div><StatBars stats={state.stats} points={state.points} /></div><button className="quest-card" onClick={() => setScreen('log')}><span className="quest-icon">📜</span><span><b>今日のクエスト</b><small>今日あったことを書いて、経験値を手に入れよう</small></span><ChevronRight /></button><div className="home-links"><button onClick={() => setScreen('history')}><BookOpen size={18} />成長のきろく <span>{state.logs.length}</span></button><button onClick={() => setScreen('jobs')}><Sparkles size={18} />職業を選び直す</button></div></section>}
      {screen === 'log' && <section className="screen narrow"><button className="back" onClick={() => setScreen('home')}>← ホームへ戻る</button><p className="eyebrow">DAILY QUEST</p><h2>今日の冒険を<br />教えてください。</h2><p className="muted">小さなことでも大丈夫。AIがあなたの成長を見つけます。</p><form onSubmit={analyze}><textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="例：会議で自分から意見を言えた。帰りに友だちの相談を聞いた。" maxLength="1000" /><div className="textarea-foot"><span>{note.length}/1000</span><button className="primary" disabled={busy || !note.trim()}>{busy ? '分析中…' : 'AIに分析してもらう'} <Sparkles size={16} /></button></div></form>{analysis && <div className={`result ${analysis.error ? 'error' : ''}`}>{analysis.error ? <p>{analysis.error}</p> : <><div className="result-pop">✨ {analysis.category} のステータスがあがった！ <b>+3</b></div><p>{analysis.progress}</p><div className="tip"><Trophy size={18} /><span><b>明日のおすすめクエスト</b>{analysis.tip}</span></div>{analysis.leveled && <div className="level-up">🎉 LEVEL UP! あなたは LV.{state.level} になった！</div>}<button className="primary wide" onClick={() => setScreen('home')}>ホームで確認する</button></>}</div>}</section>}
      {screen === 'history' && <section className="screen narrow"><button className="back" onClick={() => setScreen('home')}>← ホームへ戻る</button><p className="eyebrow">ADVENTURE LOG</p><h2>成長のきろく</h2><div className="history-list">{state.logs.length ? state.logs.map((log, index) => <article key={`${log.date}-${index}`}><div className="log-date">{log.date}<b>+3 {log.category}</b></div><p>{log.note}</p><small>次の一歩：{log.tip}</small></article>) : <div className="empty"><BookOpen size={30} /><p>まだ冒険の記録がありません。<br />今日のクエストから始めよう。</p></div>}</div></section>}
    </main>
    <footer><span>成長クエスト</span><span>自分を育てる、毎日の冒険。</span></footer>
  </div>;
}

createRoot(document.getElementById('root')).render(<App />);
