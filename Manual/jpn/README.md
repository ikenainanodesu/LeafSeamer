# LeafSeamer

NodeCGベースの放送制作管理システムであり、ミキサー、OBS、グラフィックスオーバーレイ、VB-Audio Matrixなどの複数のデバイスとサービスの統合制御プラットフォームです。

## プロジェクト概要

LeafSeamerは、ビデオ配信や番組制作のためのデバイス制御と状態管理を一元化する最新の放送制作管理システムです。プロジェクトはモジュラーアーキテクチャを採用しており、各機能は独立したNodeCGバンドルとなっているため、保守や拡張が容易です。

## 主な機能

### 🎛️ カード式シーンコントロール（Seamer）

- **視覚的なカード編成**：直感的なカードインターフェイスを使用して、さまざまな制御アクションを構成および管理します
- **マルチアクション統合**：1つのカードで複数のデバイスの連携操作をトリガーできます
- **プリセット管理**：カードレイアウトのプリセットを保存および読み込み、制作シーンを素早く切り替えます
- **サポートされるアクションタイプ**：
  - Mixer Control（ミキサーコントロール）：フェーダー、センド、ミュートなど
  - OBS Control（OBS コントロール）：シーン切り替え、トランジション効果
  - ~~Delay（遅延アクション）：正確なタイミング制御~~

### 🎚️ デバイス制御モジュール

#### Mixer Control - ミキサーコントロール

- ミキサー制御（RCPプロトコル）をサポート
- 入力チャンネルのステータスとルーティング情報のリアルタイム表示
- チャンネルフェーダー制御
- Input Send 構成（ゲイン、On/Off、Pre/Post、パン）
- ~~Patch 構成（入出力ルーティング）~~
- プリセットの保存と読み込み
- Web Dashboard 接続管理とリアルタイム制御

#### OBS Control - OBS Studio コントロール

- WebSocketを介して複数のOBSインスタンスを接続および制御
- シーン切り替え、トランジション効果の選択
- ~~録画~~、配信制御
- リアルタイム状態監視（ストリーム状態、統計情報）
- 自動再接続メカニズム（最大3回、2秒間隔）
- 接続状態のフィードバック

#### VB Matrix Control - VB-Audio Matrix コントロール

- VBANプロトコルを介してVB-Audio Matrixを制御
- オーディオルーターマトリックス管理
- Patch コントロール（複数のPatchパネルをサポート）
- ネットワーク構成とPingテスト
- ローカルIPアドレス表示
- プリセットの保存と読み込み

### 🎨 グラフィックスおよび表示モジュール

#### Graphics Package - グラフィックスパッケージ

- GSAPアニメーションライブラリの統合
- Lower Third（字幕バー）グラフィックス
- Scoreboard（スコアボード）表示
- スムーズな入場および退場アニメーション
- カスタムアニメーション効果

<details><summary>機能テスト中、近日公開予定</summary>
#### Schedule Manager - スケジュール管理

- 番組タイムテーブル管理
- スケジュール表示グラフィックス出力
- Dashboard コントロールパネル

### 🛠️ システムサービスモジュール

#### Logger System - ログシステム

- ログの収集と表示の一元化
- リアルタイムログビューア（Live Log Viewer）
- 非同期ログ処理
- 統一された幅のDashboardパネル

#### Backup System - バックアップシステム

- プロジェクト構成とデータの自動バックアップ
- archiverを使用したファイルのパッケージ化
- Dashboard バックアップコントロールパネル
- 手動バックアップトリガーのサポート

#### Data Sync Service - データ同期サービス

- Google APIs 統合
- バックグラウンドデータ同期（Dashboardインターフェイスなし）
- Google Sheets データの読み取り

</details>

## 技術スタック

### コアフレームワーク

- **NodeCG** v2.6.4 - 放送グラフィックスフレームワーク
- **React** v19.2.1 - UIコンポーネントライブラリ
- **TypeScript** v5.7.2 - 型安全な開発

### ビルドツール

- **Vite** v6.0.1 - フロントエンドビルドツール
- **esbuild** v0.27.1 - JavaScriptバンドラー
- **ts-node** - TypeScript実行環境

### 主な依存関係

- **GSAP** v3.13.0 - 高性能アニメーションライブラリ
- **obs-websocket-js** v5.0.7 - OBS WebSocketクライアント
- ~~**node-osc** v11.1.1 - OSCプロトコルサポート~~
- **googleapis** v166.0.0 - Google APIクライアント
- **archiver** v7.0.1 - ファイルアーカイブツール
- **@dnd-kit/core** v6.3.1 - ドラッグ＆ドロップサポート
- **uuid** - 一意識別子生成

## 特別な感謝

このプロジェクトは、放送グラフィックスフレームワークおよびダッシュボードである [NodeCG](https://github.com/nodecg/nodecg) 上に構築されています。彼らの素晴らしい成果なしに、これは実現できませんでした。

## プロジェクト構造

```
LeafSeamer/
├── bundles/                      # NodeCGバンドルモジュールディレクトリ
│   ├── seamer/                   # シーンコントロールカードシステム
│   ├── mixer-control/            # ミキサーコントロール
│   ├── obs-control/              # OBSコントロール
│   ├── vb-matrix-control/        # VB-Audio Matrixコントロール
│   ├── graphics-package/         # グラフィックスパッケージ（GSAPアニメーション）
│   ├── schedule-manager/         # スケジュール管理
│   ├── logger-system/            # ログシステム
│   ├── backup-system/            # バックアップシステム
│   └── data-sync-service/        # データ同期サービス
├── shared/                       # 共有リソース
│   ├── types/                    # TypeScript型定義
│   ├── utils/                    # ユーティリティ関数
│   └── constants/                # 定数定義
├── scripts/                      # ビルドおよびツールスクリプト
│   └── kill-nodecg.ps1           # NodeCGプロセス終了スクリプト
├── cfg/                          # NodeCG構成ファイル
│   ├── nodecg.json               # NodeCGコア構成
│   └── leafseamer.json           # LeafSeamerカスタム構成
├── db/                           # データベースファイル（Replicants永続化）
├── logs/                         # ログファイル
├── backups/                      # バックアップファイル
├── assets/                       # 静的リソース
├── vite.config.dashboard.ts      # Vite Dashboard構成
├── vite.config.extension.ts      # Vite Extension構成
├── tsconfig.json                 # TypeScript構成
└── package.json                  # プロジェクト構成
```

## Dashboard ワークスペース（Workspaces）

LeafSeamerのDashboardは、機能ごとに複数のワークスペースに整理されています：

- **Seamer**：シーンコントロールカードシステム
- **Mixer Control**：ミキサー接続とコントロール
- **OBS Control**：OBS接続とコントロール
- **VB Control**：VB-Audio Matrixネットワーク構成とマトリックスコントロール
- **Graphic Control**：グラフィックスパッケージコントロール
- **Misc**：バックアップコントロール、ログビューアなどの補助機能

## クイックスタート

詳細なインストールと使用方法については、以下を参照してください：

- [インストールガイド](./INSTALLATION.md)
- [ユーザーマニュアル](./USER_MANUAL.md)

### 基本コマンド

```bash
# 依存関係のインストール
npm install

# NodeCGサービスの起動
npm start

# 開発モード
npm run dev

# すべてのバンドルをビルド
npm run build

# 型チェック
npm run typecheck
```

### アクセスアドレス

起動後にアクセスしてください：

- **Dashboard**：`http://localhost:9090`
- **Graphics**：`http://localhost:9090/bundles/[bundle-name]/graphics/[graphic-name].html`

## 構成説明

- NodeCGコア構成：`cfg/nodecg.json`
- ビジネスモジュール構成：主にDashboardインターフェイスを介して動的に構成（`db/` に永続化）
- Google Sheets構成：`cfg/data-sync-service.json`（オプション）
- 各バンドルの構成はそれぞれの `package.json` で定義
- TypeScript構成：`tsconfig.json`
- Viteビルド構成：`vite.config.dashboard.ts` および `vite.config.extension.ts`

## バージョン情報

**現在のバージョン**：1.0.0
**リリース日**：2025-12-17
**最終更新日**：2025-12-17

## ライセンス

MIT
