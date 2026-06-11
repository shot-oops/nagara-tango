# reminds me

通知だけで英単語を覚える React Native（Expo）アプリ。
**ログイン不要・ローカルファースト**：アプリを開かなくても、ロック画面の通知だけで学習が完結します。

## 起動フロー

```
アプリ起動
  ↓
初期設定画面（初回のみ）  ← AsyncStorage に保存
  ↓
ホーム画面
  ↓
通知スタート
```

ログイン画面なし。すべての学習データは端末内（AsyncStorage）に保存されます。
課金は **RevenueCat のみ** で管理。

## 通知フロー

| モード     | 条件                  | 通知内容                                                       |
| ---------- | --------------------- | -------------------------------------------------------------- |
| 通常モード | `display_count < 3`   | タイトル：英単語 / 本文：日本語訳 / ボタンなし                 |
| テスト①   | `display_count >= 3`  | タイトル：英単語 / 本文：「日本語の意味は？（15秒後に答え）」 |
| テスト②   | テスト①の15秒後      | タイトル：日本語訳 / ボタン：✅覚えてた / ❌覚えてなかった     |

- ✅ → SM-2 で `interval_days *= 2.5`（35日で `mastered`、通知停止）
- ❌ → `interval_days = 1` / `display_count = 0` で通常モードに戻す

## 通知スケジュール

ユーザーは「通知しない時間帯」を最大3つまで設定できます（例：23-7時、9-12時、13-14時）。スケジューラは通知時刻がブロック内なら、そのブロックの終了時刻まで通知を後送りします。

## プラン

| 項目                | 無料             | 有料（月300円） |
| ------------------- | ---------------- | --------------- |
| 通知間隔            | 60分固定         | 5/10/15/20/30/60 |
| 単語リスト          | 大学受験基礎のみ | 全リスト        |
| カスタム単語リスト  | -                | 無制限（予定）  |
| 学習統計            | -                | あり（予定）    |

プランの真実の情報源は RevenueCat のエンタイトルメント `paid`。
オフライン時は AsyncStorage のキャッシュ値を使い、起動時にバックグラウンドで再取得します。

## セットアップ

```bash
# 1) 依存をインストール
npm install

# 2) RevenueCat の API キーを app.json の extra に設定（任意）
#    未設定でも動作します（その場合は常に 'free' プラン）
#    {
#      "extra": {
#        "revenuecatIosKey": "appl_xxxx",
#        "revenuecatAndroidKey": "goog_xxxx"
#      }
#    }

# 3) 物理デバイスで起動（通知の挙動は実機でないと確認できません）
npx expo start
```

`react-native-purchases` はネイティブモジュールなので Expo Go では動かず、
EAS dev build もしくは `npx expo prebuild` → 各プラットフォームでビルドが必要です。

## ディレクトリ

```
src/
├── components/        # Button, Screen, NotificationBlocksEditor
├── constants/         # colors, spacing
├── context/           # AppContext (replaces AuthContext)
├── data/              # bundled word lists (no DB)
├── lib/
│   ├── storage.ts             # AsyncStorage 層（profile / user_words / logs）
│   ├── revenuecat.ts          # RevenueCat (API キー未設定時は free)
│   ├── notifications.ts       # 通知カテゴリ・パーミッション
│   ├── notificationBlocks.ts  # 「通知しない時間帯」計算
│   ├── scheduler.ts           # 通知スケジューリング
│   ├── responseHandler.ts     # ✅/❌ ボタン応答
│   └── sm2.ts                 # SM-2 アルゴリズム
├── navigation/        # RootNavigator
├── screens/
│   ├── HomeScreen
│   ├── SettingsScreen
│   └── Onboarding/
│       ├── Step1ListSelect    # リスト選択
│       ├── Step2Sort          # スワイプ仕分け
│       ├── Step3Settings      # 通知設定
│       └── OnboardingFlow
└── types/             # 共通型
```

## バックアップコード（予定）

別端末への学習データ引き継ぎ用の機能。設定画面に「近日公開」プレースホルダ表示中。

## メインカラー

- Primary: `#6C63FF`（パープル）
- Secondary: `#52B788`（ミントグリーン）
- Background: `#FFFFFF`
