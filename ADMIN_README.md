# 成長クエスト 管理者メモ

このファイルは、サイトの更新・公開・環境設定を行う管理者向けの簡易手順書です。

## 1. サービスの場所

- GitHub: https://github.com/tck2563829/growth-quest
- 公開サイト: https://growth-quest-w75e.onrender.com
- Render管理画面: https://dashboard.render.com/

## 2. コードを更新して公開する方法

### 変更前

1. GitHubリポジトリを開く。
2. **Code → Codespaces** または手元のPCで作業する。
3. 変更したいファイルを編集する。

主なファイル：

- `src/main.jsx`: 画面、画面遷移、保存、ゲーム処理
- `src/styles.css`: ドットRPG風の見た目
- `server.js`: Claude API、AIフォールバック、サーバー処理
- `public/manifest.webmanifest`: スマホアプリ化用の設定
- `render.yaml`: Renderの公開設定

### PCから更新する場合

```powershell
cd "成長クエスト"
npm install
npm run build
git add -A
git commit -m "変更内容を短く書く"
git push
```

`git push` するとRenderが自動で検知し、数分以内に再デプロイします。

### 公開確認

1. Render管理画面を開く。
2. `growth-quest` を選択する。
3. **Deploys** を開く。
4. 最新デプロイが **Deploy succeeded** になるまで待つ。
5. 公開URLを開いて動作確認する。

## 3. Claude APIキーの設定

Claude APIキーはGitHubに書き込まないでください。

1. Renderで `growth-quest` を開く。
2. **Environment** を開く。
3. 次の環境変数を登録・更新する。

```text
CLAUDE_API_KEY=AnthropicのAPIキー
CLAUDE_MODEL=claude-sonnet-4-5-20250929
```

APIキーを更新したら、Renderの **Manual Deploy → Deploy latest commit** を実行します。

APIキーが未設定、またはClaude APIが一時的に失敗した場合でも、`server.js` のフォールバック分析が動きます。入力内容や選択職業から近いステータスを選び、成長を止めない設計です。

## 4. ローカルで動作確認する方法

```powershell
cd "成長クエスト"
npm install
npm run dev
```

ブラウザに表示された `http://localhost:5173` を開きます。

本番サーバーの確認をする場合：

```powershell
npm run build
npm start
```

## 5. 動作確認チェックリスト

- 職業を選べる
- 性格アンケートを最後まで回答できる
- ログインまたはゲストを選べる
- ゲストでデータが次回起動時に残らない
- ホーム・成長の記録・今日のクエスト・転生の下部メニューが表示される
- 今日の文章を送ると必ずステータスが1つ上がる
- AIエラー時もエラー画面にならず、フォールバック結果が表示される
- 上昇値が1〜3の範囲に収まる
- 成長の記録に入力内容とAIの返信が残る
- 転生後も職業ごとのレベルが復元される
- スマートフォンで「ホーム画面に追加」ができる

## 6. よくある問題

### Renderのデプロイが失敗する

- RenderのDeploysでログを開く。
- `npm run build` のエラーを確認する。
- ローカルで `npm run build` を実行して再現する。
- 修正後に `git push` する。

### Claude APIエラーが表示される

- RenderのEnvironmentで `CLAUDE_API_KEY` が登録されているか確認する。
- APIキーに前後の空白がないか確認する。
- Claude APIの利用上限や障害状況を確認する。
- フォールバックは自動で動くため、入力内容の分析自体は継続できる。

### 更新がサイトに反映されない

- GitHubの最新コミットがpushされているか確認する。
- RenderのDeploysが **Deploy succeeded** になっているか確認する。
- ブラウザを強制更新する。
- PWA利用中の場合は、一度サイトを閉じて再起動する。

## 7. データについて

- ゲストのデータは保存しない仕様です。
- ログインユーザーの現在の保存先はブラウザの `localStorage` です。
- ブラウザのデータ削除、別端末、別ブラウザではログインユーザーのデータも共有されません。
- 複数端末で本格的に同期する場合は、Supabase Authとデータベース接続を追加してください。

## 8. 安全上の注意

- `.env` はGitHubへpushしない。
- Claude APIキーをソースコードへ直接書かない。
- APIキーをチャット、スクリーンショット、公開Issueへ貼らない。
- 不要になったAPIキーはAnthropic側で無効化して作り直す。
