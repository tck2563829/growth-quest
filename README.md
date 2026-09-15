# 成長クエスト

ドラクエ風の「なりたい職業」を選び、毎日の出来事を成長ログとして残す自己分析アプリです。

## ローカルで起動

```bash
npm install
npm run dev
```

本番サーバーとして確認する場合は、先に `npm run build` を実行してから `npm start` を使います。

## Claude API

ClaudeのAPIキーはブラウザに公開せず、Expressのサーバーから呼び出します。

1. `.env.example` を `.env` にコピー
2. `CLAUDE_API_KEY` にAnthropicのAPIキーを設定
3. 必要に応じて `CLAUDE_MODEL` を変更

APIキーが未設定の場合も、開発確認用のローカルフォールバック分析が動作します。

## ログインと保存

現在のログイン画面はデモログインとして動作し、ブラウザの `localStorage` に職業・ステータス・成長ログを保存します。
複数端末での本番ログインを有効にする場合は、Supabase Authを導入し、`VITE_SUPABASE_URL` と `VITE_SUPABASE_ANON_KEY` を設定した上で認証処理を差し替えてください。

## GitHub / Renderへの公開

1. このフォルダだけを新しいGitHubリポジトリ（例: `growth-quest`）へpushします。
2. Renderで **New + → Web Service** を選び、リポジトリを接続します。
3. `render.yaml` を使うか、次の設定を指定します。
   - Build Command: `npm ci && npm run build`
   - Start Command: `npm start`
   - Environment Variable: `CLAUDE_API_KEY`
4. ClaudeのAPIキーはGitHubへcommitせず、RenderのEnvironmentにだけ登録します。
