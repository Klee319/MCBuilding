/**
 * MockSpamDetectorGateway Tests
 *
 * Mock Spam Detector Gatewayの単体テスト
 * - レート制限チェック
 * - コンテンツチェック
 * - ブロックコンテンツ設定
 * - ヘルパーメソッド
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { MockSpamDetectorGateway } from '../../../../src/infra/gateways/mock/mock-spam-detector-gateway.js';

describe('MockSpamDetectorGateway', () => {
  let gateway: MockSpamDetectorGateway;

  beforeEach(() => {
    gateway = new MockSpamDetectorGateway();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ========================================
  // checkRateLimit テスト
  // ========================================

  describe('checkRateLimit', () => {
    it('レート制限内であれば許可されること', async () => {
      const result = await gateway.checkRateLimit('user-123', 'post');

      expect(result.allowed).toBe(true);
      expect(result.currentCount).toBe(1);
      expect(result.maxCount).toBe(10); // デフォルト
    });

    it('アクションがカウントされること', async () => {
      await gateway.checkRateLimit('user-123', 'post');
      const result = await gateway.checkRateLimit('user-123', 'post');

      expect(result.currentCount).toBe(2);
    });

    it('制限に達すると許可されないこと', async () => {
      // デフォルト: 10回/分
      for (let i = 0; i < 10; i++) {
        await gateway.checkRateLimit('user-123', 'post');
      }

      const result = await gateway.checkRateLimit('user-123', 'post');

      expect(result.allowed).toBe(false);
      expect(result.retryAfter).toBeDefined();
      expect(result.retryAfter).toBeGreaterThan(0);
    });

    it('異なるユーザーは別々にカウントされること', async () => {
      // user-1のみ制限に達する
      for (let i = 0; i < 10; i++) {
        await gateway.checkRateLimit('user-1', 'post');
      }

      const result1 = await gateway.checkRateLimit('user-1', 'post');
      const result2 = await gateway.checkRateLimit('user-2', 'post');

      expect(result1.allowed).toBe(false);
      expect(result2.allowed).toBe(true);
    });

    it('異なるアクションは別々にカウントされること', async () => {
      // postアクションのみ制限に達する
      for (let i = 0; i < 10; i++) {
        await gateway.checkRateLimit('user-123', 'post');
      }

      const postResult = await gateway.checkRateLimit('user-123', 'post');
      const likeResult = await gateway.checkRateLimit('user-123', 'like');

      expect(postResult.allowed).toBe(false);
      expect(likeResult.allowed).toBe(true);
    });

    it('時間が経過すると制限がリセットされること', async () => {
      // 制限に達する
      for (let i = 0; i < 10; i++) {
        await gateway.checkRateLimit('user-123', 'post');
      }
      expect((await gateway.checkRateLimit('user-123', 'post')).allowed).toBe(false);

      // 1分経過
      vi.advanceTimersByTime(60001);

      const result = await gateway.checkRateLimit('user-123', 'post');
      expect(result.allowed).toBe(true);
      expect(result.currentCount).toBe(1);
    });

    describe('setDefaultRateLimit', () => {
      it('デフォルトのレート制限を変更できること', async () => {
        gateway.setDefaultRateLimit(5, 30000); // 5回/30秒

        // 5回まで許可
        for (let i = 0; i < 5; i++) {
          await gateway.checkRateLimit('user-123', 'post');
        }

        const result = await gateway.checkRateLimit('user-123', 'post');
        expect(result.allowed).toBe(false);
        expect(result.maxCount).toBe(5);
      });

      it('ウィンドウ時間を変更できること', async () => {
        gateway.setDefaultRateLimit(10, 5000); // 10回/5秒

        // 制限に達する
        for (let i = 0; i < 10; i++) {
          await gateway.checkRateLimit('user-123', 'post');
        }
        expect((await gateway.checkRateLimit('user-123', 'post')).allowed).toBe(false);

        // 5秒経過
        vi.advanceTimersByTime(5001);

        const result = await gateway.checkRateLimit('user-123', 'post');
        expect(result.allowed).toBe(true);
      });
    });

    describe('setRateLimitForAction', () => {
      it('特定のアクションにレート制限を設定できること', async () => {
        gateway.setRateLimitForAction('upload', 3, 60000); // 3回/分

        for (let i = 0; i < 3; i++) {
          await gateway.checkRateLimit('user-123', 'upload');
        }

        const result = await gateway.checkRateLimit('user-123', 'upload');
        expect(result.allowed).toBe(false);
        expect(result.maxCount).toBe(3);
      });

      it('アクション固有の設定がデフォルトより優先されること', async () => {
        gateway.setDefaultRateLimit(10, 60000);
        gateway.setRateLimitForAction('special', 2, 60000);

        // specialアクションは2回で制限
        for (let i = 0; i < 2; i++) {
          await gateway.checkRateLimit('user-123', 'special');
        }
        expect((await gateway.checkRateLimit('user-123', 'special')).allowed).toBe(false);

        // 他のアクションは10回まで許可
        const otherResult = await gateway.checkRateLimit('user-123', 'other');
        expect(otherResult.allowed).toBe(true);
        expect(otherResult.maxCount).toBe(10);
      });
    });

    describe('recordAction', () => {
      it('事前にアクションを記録できること', async () => {
        // 事前に9回記録
        for (let i = 0; i < 9; i++) {
          gateway.recordAction('user-123', 'post');
        }

        // 次の1回で制限
        const result = await gateway.checkRateLimit('user-123', 'post');
        expect(result.allowed).toBe(true);
        expect(result.currentCount).toBe(10);

        // もう1回で超過
        const result2 = await gateway.checkRateLimit('user-123', 'post');
        expect(result2.allowed).toBe(false);
      });
    });
  });

  // ========================================
  // checkContent テスト
  // ========================================

  describe('checkContent', () => {
    it('通常のコンテンツは許可されること', async () => {
      const result = await gateway.checkContent('This is a normal message');

      expect(result.allowed).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.9);
    });

    describe('ブロックコンテンツ', () => {
      it('ブロックされたワードを含むコンテンツは拒否されること', async () => {
        gateway.addBlockedContent('spam');

        const result = await gateway.checkContent('This is spam content');

        expect(result.allowed).toBe(false);
        expect(result.reason).toContain('prohibited');
        expect(result.confidence).toBe(1.0);
        expect(result.categories).toContain('prohibited_content');
      });

      it('大文字小文字を区別しないこと', async () => {
        gateway.addBlockedContent('badword');

        const result1 = await gateway.checkContent('This contains BADWORD');
        const result2 = await gateway.checkContent('This contains BadWord');
        const result3 = await gateway.checkContent('This contains badword');

        expect(result1.allowed).toBe(false);
        expect(result2.allowed).toBe(false);
        expect(result3.allowed).toBe(false);
      });

      it('複数のブロックワードを設定できること', async () => {
        gateway.addBlockedContent('spam');
        gateway.addBlockedContent('scam');
        gateway.addBlockedContent('phishing');

        expect((await gateway.checkContent('This is spam')).allowed).toBe(false);
        expect((await gateway.checkContent('This is a scam')).allowed).toBe(false);
        expect((await gateway.checkContent('phishing attempt')).allowed).toBe(false);
      });

      it('部分一致でブロックされること', async () => {
        gateway.addBlockedContent('bad');

        const result = await gateway.checkContent('This is a baddie');

        expect(result.allowed).toBe(false);
      });
    });

    describe('スパム検出パターン', () => {
      it('多数のURLを含むコンテンツはスパムとして検出されること', async () => {
        const content =
          'Check these links: http://a.com http://b.com http://c.com http://d.com';

        const result = await gateway.checkContent(content);

        expect(result.allowed).toBe(false);
        expect(result.categories).toContain('spam');
        expect(result.confidence).toBeLessThan(1.0);
      });

      it('3つ以下のURLは許可されること', async () => {
        const content = 'Check these: http://a.com http://b.com http://c.com';

        const result = await gateway.checkContent(content);

        expect(result.allowed).toBe(true);
      });

      it('繰り返し文字のみの短いコンテンツはスパムとして検出されること', async () => {
        // 10文字以上の繰り返しで20文字未満のコンテンツ
        const content = 'aaaaaaaaaaa';

        const result = await gateway.checkContent(content);

        expect(result.allowed).toBe(false);
        expect(result.categories).toContain('spam');
      });

      it('長いコンテンツ内の繰り返しは許可されること', async () => {
        const content = 'This is a looooooooooooong word in a normal sentence';

        const result = await gateway.checkContent(content);

        expect(result.allowed).toBe(true);
      });
    });

    describe('エッジケース', () => {
      it('空文字列は許可されること', async () => {
        const result = await gateway.checkContent('');
        expect(result.allowed).toBe(true);
      });

      it('絵文字を含むコンテンツは許可されること', async () => {
        const result = await gateway.checkContent('Hello world! ');
        expect(result.allowed).toBe(true);
      });

      it('Unicode文字を含むコンテンツは許可されること', async () => {
        const result = await gateway.checkContent('');
        expect(result.allowed).toBe(true);
      });

      it('非常に長いコンテンツも処理できること', async () => {
        const longContent = 'This is a normal sentence. '.repeat(1000);
        const result = await gateway.checkContent(longContent);
        expect(result.allowed).toBe(true);
      });
    });
  });

  // ========================================
  // ヘルパーメソッド テスト
  // ========================================

  describe('clear', () => {
    it('アクションレコードをクリアできること', async () => {
      // アクションを記録
      for (let i = 0; i < 5; i++) {
        await gateway.checkRateLimit('user-123', 'post');
      }

      gateway.clear();

      const result = await gateway.checkRateLimit('user-123', 'post');
      expect(result.currentCount).toBe(1);
    });

    it('レート制限設定をクリアできること', async () => {
      gateway.setRateLimitForAction('special', 1, 60000);
      gateway.clear();

      // デフォルトの設定が使用される
      const result = await gateway.checkRateLimit('user-123', 'special');
      expect(result.maxCount).toBe(10); // デフォルト値
    });

    it('ブロックコンテンツをクリアできること', async () => {
      gateway.addBlockedContent('spam');
      expect((await gateway.checkContent('This is spam')).allowed).toBe(false);

      gateway.clear();

      expect((await gateway.checkContent('This is spam')).allowed).toBe(true);
    });
  });

  // ========================================
  // 複合シナリオ テスト
  // ========================================

  describe('複合シナリオ', () => {
    it('複数ユーザーが同時にアクションを実行するシナリオ', async () => {
      gateway.setDefaultRateLimit(5, 60000);

      // 複数ユーザーが交互にアクション
      for (let i = 0; i < 3; i++) {
        await gateway.checkRateLimit('user-1', 'post');
        await gateway.checkRateLimit('user-2', 'post');
        await gateway.checkRateLimit('user-3', 'post');
      }

      // 各ユーザー3回ずつ
      const result1 = await gateway.checkRateLimit('user-1', 'post');
      const result2 = await gateway.checkRateLimit('user-2', 'post');
      const result3 = await gateway.checkRateLimit('user-3', 'post');

      expect(result1.currentCount).toBe(4);
      expect(result2.currentCount).toBe(4);
      expect(result3.currentCount).toBe(4);
    });

    it('時間経過と新規アクションの混在シナリオ', async () => {
      gateway.setDefaultRateLimit(3, 1000); // 3回/秒

      // 3回実行
      await gateway.checkRateLimit('user-123', 'post');
      await gateway.checkRateLimit('user-123', 'post');
      await gateway.checkRateLimit('user-123', 'post');

      // 制限到達
      expect((await gateway.checkRateLimit('user-123', 'post')).allowed).toBe(false);

      // 500ms経過
      vi.advanceTimersByTime(500);

      // まだ制限中
      expect((await gateway.checkRateLimit('user-123', 'post')).allowed).toBe(false);

      // さらに501ms経過（合計1001ms）
      vi.advanceTimersByTime(501);

      // 制限解除
      const result = await gateway.checkRateLimit('user-123', 'post');
      expect(result.allowed).toBe(true);
    });
  });
});
