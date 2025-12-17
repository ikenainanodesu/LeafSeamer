# LeafSeamer インストールガイド

このドキュメントでは、LeafSeamer 1.0.0の完全なインストールと展開の手順について説明します。

## システム要件

### 最小構成

- **OS**：Windows 10/11、macOS 10.15+、Linux（Ubuntu 20.04+）
- **Node.js**：v18.0.0 以降
- **NPM**：v9.0.0 以降
- **RAM**：4GB
- **ディスク容量**：少なくとも1GBの空き容量

### 推奨構成

- **Node.js**：v20.0.0+
- **RAM**：8GB以上
- **ネットワーク**：デバイス通信用のLAN環境

## インストール手順

### 1. Node.js と NPM のインストール

Node.jsがまだインストールされていない場合は、[nodejs.org](https://nodejs.org/) にアクセスして、LTSバージョンをダウンロードしてインストールしてください。

インストールの確認：

```bash
node --version  # v18.0.0 以降が表示されるはずです
npm --version   # v9.0.0 以降が表示されるはずです
```

### 2. LeafSeamer のダウンロード

#### 方法1：GitHubからクローン（推奨）

```bash
git clone https://github.com/ikenainanodesu/LeafSeamer.git
cd LeafSeamer
```

#### 方法2：ソースコードzipのダウンロード

1. GitHubリポジトリの Releases ページにアクセスします
2. 最新バージョンのソースコードzipをダウンロードします
3. 選択したディレクトリに解凍します

### 3. 依存関係のインストール

プロジェクトのルートディレクトリで実行します：

```bash
npm install
```

> **注意**：初回インストールはネットワーク速度によって数分かかる場合があります。NPMは必要なすべての依存パッケージを自動的にインストールします。

### 4. プロジェクトのビルド

インストール完了後、すべてのバンドルをビルドします：

```bash
npm run build
```

このコマンドは以下を実行します：

- すべてのTypeScriptコードをコンパイル
- すべてのバンドルのExtensionとDashboardをビルド
- 実行可能なプロダクションコードを生成

## 構成説明

### NodeCG コア構成

`cfg/nodecg.json` 構成ファイルを編集します：

```json
{
  "host": "0.0.0.0",
  "port": 9090,
  "logging": {
    "console": {
      "enabled": true,
      "level": "info"
    }
  }
}
```

**構成項目の説明**：

- `host`：サーバーのリッスンアドレス（`0.0.0.0` は他のデバイスからのアクセスを許可）
- `port`：Dashboardアクセスポート（デフォルト 9090）
- `logging`：ログ構成

### モジュール構成

LeafSeamerのコア機能モジュール（ミキサー、OBS、マトリックス制御）は、構成ファイルを編集する**必要はありません**。**Dashboard** インターフェイスで直接接続構成を行ってください。システムは設定を自動的に保存します。

### Google Sheets API 構成（オプション）

`data-sync-service` バンドルを使用して外部データを同期する必要がある場合は、`cfg/data-sync-service.json` 構成ファイルを作成してください：

```json
{
  "googleSheets": {
    "credentialsPath": "./credentials.json",
    "spreadsheetId": "your-spreadsheet-id"
  }
}
```

構成手順：

1. [Google Cloud Console](https://console.cloud.google.com/) にアクセスします
2. 新しいプロジェクトを作成するか、既存のプロジェクトを選択します
3. Google Sheets APIを有効にします
4. サービスアカウントを作成し、JSONキーファイルをダウンロードします
5. キーファイルの名前を `credentials.json` に変更し、プロジェクトのルートディレクトリに配置します

## サービスの開始

### 開発モード

```bash
npm start
# または
npm run dev
```

起動後、コンソールに以下が表示されます：

```
NodeCG is listening on http://localhost:9090
```

### Dashboard へのアクセス

ブラウザで開きます：

```
http://localhost:9090
```

他のデバイスからアクセスする場合は、サーバーのIPアドレスを使用してください：

```
http://[サーバーIP]:9090
```

### すべてのバンドルが読み込まれたことの確認

起動ログに以下のような出力が表示されるはずです：

```
[nodecg] Loaded bundles:
  - seamer
  - mixer-control
  - obs-control
  - vb-matrix-control
  - graphics-package
  - schedule-manager
  - logger-system
  - backup-system
  - data-sync-service
```

## サービスの停止

NodeCGを実行しているターミナルウィンドウで `Ctrl+C` を押してサービスを停止します。

### Windowsユーザー向けの強制終了

ポート占有の問題が発生した場合は、提供されているヘルパースクリプトを使用できます：

```powershell
.\scripts\kill-nodecg.ps1
```

または、ポート9090を占有しているプロセスを手動で終了します：

```powershell
Get-NetTCPConnection -LocalPort 9090 | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }
```

## ファイアウォールとネットワーク構成

### ポートの開放

ファイアウォールで以下のポートが開放されていることを確認してください（構成に応じて）：

- **9090**：NodeCG DashboardおよびGraphics（必須）
- **49280**：Mixer RCP通信（mixer-controlを使用する場合）
- **4455**：OBS WebSocket（obs-controlを使用する場合）
- **6980**：VB-Audio Matrix VBAN（vb-matrix-controlを使用する場合）

### Windowsファイアウォール構成例

```powershell
# NodeCG インバウンド接続を許可
New-NetFirewallRule -DisplayName "NodeCG Server" -Direction Inbound -LocalPort 9090 -Protocol TCP -Action Allow
```

## データの永続化

LeafSeamerはNodeCGのReplicantsシステムを使用してデータを永続化します：

- **保存パス**：`db/` ディレクトリ
- **バックアップパス**：`backups/` ディレクトリ
- **ログパス**：`logs/` ディレクトリ

> **重要**：データの損失を防ぐために、定期的に `db/` ディレクトリをバックアップしてください。DashboardのBackup Systemを使用して、手動または自動でバックアップできます。

## .gitignore について

プロジェクトの `.gitignore` ファイルは、以下を除外するように構成されています：

- `node_modules/`：NPM依存パッケージ
- `db/`：データベースファイル（ユーザーデータを含む）
- `logs/`：ログファイル
- `backups/`：バックアップファイル
- `dist/`：ビルド成果物
- `.env`：環境変数ファイル
- `project-documents/`：プロジェクトドキュメント（開発ドキュメント）
- `.agent/`：AIアシスタントツール設定

チームで構成を共有する必要がある場合は、以下を推奨します：

1. 構成テンプレートとして `cfg/nodecg.json.example` を作成します
2. 実際の構成ファイル `cfg/nodecg.json` と `cfg/data-sync-service.json` を `.gitignore` に追加します
3. チームメンバーはテンプレートに基づいて独自の構成ファイルを作成します

## トラブルシューティング

問題が発生した場合は、ログシステムを確認してください。

一般的な問題のクイックチェック：

1. **ポートが占有されている**：`kill-nodecg.ps1` スクリプトを使用するか、構成ファイルのポートを変更します
2. **バンドルの読み込み失敗**：`npm run build` を実行して再ビルドします
3. **依存関係の欠落**：`npm install` を実行して依存関係を再インストールします
4. **デバイス接続失敗**：DashboardパネルのIPアドレスとポート構成を確認します

## 次のステップ

インストールの完了後、各機能モジュールの使用方法については [ユーザーマニュアル](./USER_MANUAL.md) を参照してください。

## テクニカルサポート

- **ドキュメント**：[README.md](./README.md) および [USER_MANUAL.md](./USER_MANUAL.md) を確認してください
