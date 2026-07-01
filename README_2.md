# 積読 (Tsundoku)

買った本と向き合うためのアプリ。未読の本が背表紙の山として積み上がり、読み終えると山が低くなる。

Vite + React 製。バックエンドなし。データはブラウザの `localStorage` に保存される（端末ごと・そのブラウザごと）。

## ローカルで動かす

Node.js 18 以上が必要。

```bash
npm install
npm run dev
```

表示された `http://localhost:5173` を開く。

本番ビルドの確認：

```bash
npm run build
npm run preview
```

## GitHub に上げる

```bash
git init
git add .
git commit -m "積読アプリ"
git branch -M main
git remote add origin https://github.com/<あなたのユーザー名>/tsundoku.git
git push -u origin main
```

（先に GitHub で空のリポジトリ `tsundoku` を作っておく。README などにチェックは入れない方が push が楽。）

## Vercel にデプロイする

### 方法A：GitHub 連携（おすすめ）

1. https://vercel.com にログイン →「Add New… → Project」。
2. さっき push したリポジトリを Import。
3. Framework Preset が自動で **Vite** になる。設定はそのままで OK
   （Build Command: `npm run build` / Output Directory: `dist`）。
4. 「Deploy」を押す。数十秒で `https://tsundoku-xxxx.vercel.app` が発行される。

以降は `git push` するたびに自動で再デプロイされる。

### 方法B：Vercel CLI

```bash
npm i -g vercel
vercel        # 初回はプロジェクト作成の質問に答える
vercel --prod # 本番反映
```

## メモ

- データはその端末のブラウザにのみ保存される。別の端末やブラウザとは同期しない。
- 複数端末で同期したくなったら、Vercel KV や Supabase などのデータベースに保存先を差し替える（`src/App.jsx` の `loadBooks` / `saveBooks` を書き換える）。
