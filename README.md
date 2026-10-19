# MiniCraft

three.js + WebSocket で動く、Minecraft風のオンラインマルチプレイ・ボクセルゲーム。
サーバーは Node.js(`ws` のみ依存)、クライアントは `public/index.html` 1ファイル。

## 機能
- シード値による無限地形(砂浜・木)/ ブロック8種(プロシージャルなドット絵テクスチャ)
- ブロックの破壊・設置、飛行モード、衝突判定
- マルチプレイ(他プレイヤー表示、ブロック変更のリアルタイム同期)
- キャラクリ(肌・髪・服・ズボンの色、髪型)/ 頭上のネームタグ(遠いほど小さく薄く)
- ワールドの保存(`data/world.json`)

## 操作
WASD 移動 / Space ジャンプ / Ctrl ダッシュ / F 飛行切替(Space↑ Shift↓)/
左クリック 破壊 / 右クリック 設置 / 1〜8・ホイール ブロック選択 / Esc メニュー

## ローカル起動
```bash
npm install
npm start          # http://localhost:3000
SEED=minecraft npm start   # シード指定
```

## シード
| 方法 | 説明 |
|---|---|
| 環境変数 `SEED` | 数字はそのまま、文字列はハッシュ化して使用。未設定ならランダム |
| 環境変数 `ADMIN_KEY` | 設定すると、メニューに「ワールド再生成」欄が出て、ゲーム内から新しいシードに変更できる(全員のワールドが作り直され、建築は消える) |
| 保存 | シードと建築は `data/world.json` に保存。`SEED` を変えると保存済みの建築は破棄される |

現在のシードはHUD(左上)とメニューに表示されます。

## Renderにデプロイ
1. このリポジトリをGitHubにpush
2. Render → **New → Blueprint**(または **Web Service**)でリポジトリを選択
3. Web Service の場合: Build `npm install` / Start `node server.js` / Health Check `/healthz`
4. 必要なら環境変数 `SEED` / `ADMIN_KEY` を設定

> Free プランはファイルシステムが一時的で、スリープ・再デプロイで `data/` が消えます。
> 恒久的に残すなら有料プランの Render Disk を `/opt/render/project/src/data` にマウントするか、
> `DATA_DIR` でマウント先を指定してください。

## 構成
```
server.js          HTTP + WebSocket サーバー
public/index.html  ゲーム本体(HTML/CSS/JS)
render.yaml        Render Blueprint
```
