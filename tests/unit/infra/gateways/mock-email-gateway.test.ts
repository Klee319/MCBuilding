/**
 * MockEmailGateway Tests
 *
 * Mock Email Gatewayの単体テスト
 * - 検証メール送信
 * - パスワードリセットメール送信
 * - エラーシナリオ
 * - ヘルパーメソッド
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  MockEmailGateway,
  type SentEmail,
} from '../../../../src/infra/gateways/mock/mock-email-gateway.js';

describe('MockEmailGateway', () => {
  let gateway: MockEmailGateway;

  beforeEach(() => {
    gateway = new MockEmailGateway();
  });

  // ========================================
  // sendVerificationEmail テスト
  // ========================================

  describe('sendVerificationEmail', () => {
    it('検証メールを正常に送信できること', async () => {
      // Arrange
      const email = 'test@example.com';
      const token = 'verification-token-123';

      // Act
      await gateway.sendVerificationEmail(email, token);

      // Assert
      const sentEmails = gateway.getSentEmails();
      expect(sentEmails).toHaveLength(1);
      expect(sentEmails[0]).toMatchObject({
        to: email,
        type: 'verification',
        token: token,
      });
    });

    it('送信日時が記録されること', async () => {
      // Arrange
      const before = new Date();

      // Act
      await gateway.sendVerificationEmail('test@example.com', 'token');

      // Assert
      const after = new Date();
      const sentEmails = gateway.getSentEmails();
      expect(sentEmails[0].sentAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(sentEmails[0].sentAt.getTime()).toBeLessThanOrEqual(after.getTime());
    });

    it('複数のメールを送信できること', async () => {
      // Act
      await gateway.sendVerificationEmail('user1@example.com', 'token1');
      await gateway.sendVerificationEmail('user2@example.com', 'token2');
      await gateway.sendVerificationEmail('user3@example.com', 'token3');

      // Assert
      const sentEmails = gateway.getSentEmails();
      expect(sentEmails).toHaveLength(3);
      expect(sentEmails[0].to).toBe('user1@example.com');
      expect(sentEmails[1].to).toBe('user2@example.com');
      expect(sentEmails[2].to).toBe('user3@example.com');
    });

    it('shouldFailがtrueの場合にエラーをスローすること', async () => {
      // Arrange
      gateway.setShouldFail(true);

      // Act & Assert
      await expect(
        gateway.sendVerificationEmail('test@example.com', 'token')
      ).rejects.toThrow('Failed to send email');
    });

    it('エラー時にメールが保存されないこと', async () => {
      // Arrange
      gateway.setShouldFail(true);

      // Act
      try {
        await gateway.sendVerificationEmail('test@example.com', 'token');
      } catch {
        // Expected
      }

      // Assert
      expect(gateway.getSentEmails()).toHaveLength(0);
    });
  });

  // ========================================
  // sendPasswordResetEmail テスト
  // ========================================

  describe('sendPasswordResetEmail', () => {
    it('パスワードリセットメールを正常に送信できること', async () => {
      // Arrange
      const email = 'reset@example.com';
      const token = 'reset-token-456';

      // Act
      await gateway.sendPasswordResetEmail(email, token);

      // Assert
      const sentEmails = gateway.getSentEmails();
      expect(sentEmails).toHaveLength(1);
      expect(sentEmails[0]).toMatchObject({
        to: email,
        type: 'password_reset',
        token: token,
      });
    });

    it('shouldFailがtrueの場合にエラーをスローすること', async () => {
      // Arrange
      gateway.setShouldFail(true);

      // Act & Assert
      await expect(
        gateway.sendPasswordResetEmail('test@example.com', 'token')
      ).rejects.toThrow('Failed to send email');
    });

    it('検証メールとパスワードリセットメールを区別できること', async () => {
      // Act
      await gateway.sendVerificationEmail('user@example.com', 'verify-token');
      await gateway.sendPasswordResetEmail('user@example.com', 'reset-token');

      // Assert
      const sentEmails = gateway.getSentEmails();
      expect(sentEmails).toHaveLength(2);
      expect(sentEmails[0].type).toBe('verification');
      expect(sentEmails[1].type).toBe('password_reset');
    });
  });

  // ========================================
  // ヘルパーメソッド テスト
  // ========================================

  describe('clear', () => {
    it('送信済みメールをクリアできること', async () => {
      // Arrange
      await gateway.sendVerificationEmail('test@example.com', 'token');
      expect(gateway.getSentEmails()).toHaveLength(1);

      // Act
      gateway.clear();

      // Assert
      expect(gateway.getSentEmails()).toHaveLength(0);
    });

    it('shouldFailフラグもリセットされること', async () => {
      // Arrange
      gateway.setShouldFail(true);

      // Act
      gateway.clear();

      // Assert - エラーなく送信できることで確認
      await expect(
        gateway.sendVerificationEmail('test@example.com', 'token')
      ).resolves.not.toThrow();
    });
  });

  describe('getSentEmails', () => {
    it('空の場合は空配列を返すこと', () => {
      expect(gateway.getSentEmails()).toEqual([]);
    });

    it('読み取り専用の配列を返すこと', async () => {
      // Arrange
      await gateway.sendVerificationEmail('test@example.com', 'token');

      // Act
      const emails = gateway.getSentEmails();

      // Assert - readonly配列であることを型レベルで確認
      // 実行時には変更可能だが、TypeScriptの型チェックで警告される
      expect(Array.isArray(emails)).toBe(true);
      expect(emails).toHaveLength(1);
    });
  });

  describe('setShouldFail', () => {
    it('falseに設定後は正常に送信できること', async () => {
      // Arrange
      gateway.setShouldFail(true);
      gateway.setShouldFail(false);

      // Act & Assert
      await expect(
        gateway.sendVerificationEmail('test@example.com', 'token')
      ).resolves.not.toThrow();
    });

    it('複数回切り替えできること', async () => {
      // Act & Assert
      gateway.setShouldFail(true);
      await expect(
        gateway.sendVerificationEmail('test@example.com', 'token')
      ).rejects.toThrow();

      gateway.setShouldFail(false);
      await expect(
        gateway.sendVerificationEmail('test@example.com', 'token')
      ).resolves.not.toThrow();

      gateway.setShouldFail(true);
      await expect(
        gateway.sendVerificationEmail('test@example.com', 'token')
      ).rejects.toThrow();
    });
  });

  // ========================================
  // エッジケース テスト
  // ========================================

  describe('エッジケース', () => {
    it('空文字列のメールアドレスでも送信できること', async () => {
      // Note: バリデーションはUsecase層で行うべき
      await gateway.sendVerificationEmail('', 'token');

      const sentEmails = gateway.getSentEmails();
      expect(sentEmails).toHaveLength(1);
      expect(sentEmails[0].to).toBe('');
    });

    it('空文字列のトークンでも送信できること', async () => {
      await gateway.sendVerificationEmail('test@example.com', '');

      const sentEmails = gateway.getSentEmails();
      expect(sentEmails).toHaveLength(1);
      expect(sentEmails[0].token).toBe('');
    });

    it('特殊文字を含むメールアドレスでも送信できること', async () => {
      const specialEmail = 'test+special@sub.example.com';
      await gateway.sendVerificationEmail(specialEmail, 'token');

      const sentEmails = gateway.getSentEmails();
      expect(sentEmails[0].to).toBe(specialEmail);
    });

    it('Unicode文字を含むトークンでも送信できること', async () => {
      const unicodeToken = 'token-with-unicode-';
      await gateway.sendVerificationEmail('test@example.com', unicodeToken);

      const sentEmails = gateway.getSentEmails();
      expect(sentEmails[0].token).toBe(unicodeToken);
    });

    it('非常に長いトークンでも送信できること', async () => {
      const longToken = 'a'.repeat(10000);
      await gateway.sendVerificationEmail('test@example.com', longToken);

      const sentEmails = gateway.getSentEmails();
      expect(sentEmails[0].token).toBe(longToken);
    });
  });
});
