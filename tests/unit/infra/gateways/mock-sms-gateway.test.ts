/**
 * MockSmsGateway Tests
 *
 * Mock SMS Gatewayの単体テスト
 * - SMS検証コード送信
 * - 電話番号バリデーション
 * - エラーシナリオ
 * - ヘルパーメソッド
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  MockSmsGateway,
  type SentSms,
} from '../../../../src/infra/gateways/mock/mock-sms-gateway.js';
import { PortError } from '../../../../src/usecase/ports/types.js';

describe('MockSmsGateway', () => {
  let gateway: MockSmsGateway;

  beforeEach(() => {
    gateway = new MockSmsGateway();
  });

  // ========================================
  // sendVerificationCode テスト
  // ========================================

  describe('sendVerificationCode', () => {
    it('E.164形式の電話番号に正常に送信できること', async () => {
      // Arrange
      const phoneNumber = '+81901234567';
      const code = '123456';

      // Act
      await gateway.sendVerificationCode(phoneNumber, code);

      // Assert
      const sentMessages = gateway.getSentMessages();
      expect(sentMessages).toHaveLength(1);
      expect(sentMessages[0]).toMatchObject({
        phoneNumber,
        code,
      });
    });

    it('送信日時が記録されること', async () => {
      // Arrange
      const before = new Date();

      // Act
      await gateway.sendVerificationCode('+81901234567', '123456');

      // Assert
      const after = new Date();
      const sentMessages = gateway.getSentMessages();
      expect(sentMessages[0].sentAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(sentMessages[0].sentAt.getTime()).toBeLessThanOrEqual(after.getTime());
    });

    it('様々な国の電話番号に送信できること', async () => {
      // Act
      await gateway.sendVerificationCode('+1234567890', '111111'); // US
      await gateway.sendVerificationCode('+81901234567', '222222'); // Japan
      await gateway.sendVerificationCode('+442071234567', '333333'); // UK
      await gateway.sendVerificationCode('+8613812345678', '444444'); // China

      // Assert
      const sentMessages = gateway.getSentMessages();
      expect(sentMessages).toHaveLength(4);
    });

    describe('電話番号バリデーション', () => {
      it('E.164形式でない電話番号はエラーになること', async () => {
        // Act & Assert
        await expect(
          gateway.sendVerificationCode('09012345678', '123456')
        ).rejects.toThrow(PortError);
      });

      it('+がない電話番号はエラーになること', async () => {
        await expect(
          gateway.sendVerificationCode('81901234567', '123456')
        ).rejects.toThrow(PortError);
      });

      it('+0で始まる電話番号はエラーになること', async () => {
        await expect(
          gateway.sendVerificationCode('+0901234567', '123456')
        ).rejects.toThrow(PortError);
      });

      it('短すぎる電話番号はエラーになること', async () => {
        await expect(
          gateway.sendVerificationCode('+1', '123456')
        ).rejects.toThrow(PortError);
      });

      it('長すぎる電話番号はエラーになること', async () => {
        // E.164は最大15桁
        await expect(
          gateway.sendVerificationCode('+1234567890123456', '123456')
        ).rejects.toThrow(PortError);
      });

      it('アルファベットを含む電話番号はエラーになること', async () => {
        await expect(
          gateway.sendVerificationCode('+1234abc5678', '123456')
        ).rejects.toThrow(PortError);
      });

      it('エラーコードがINVALID_PHONE_NUMBERであること', async () => {
        try {
          await gateway.sendVerificationCode('invalid', '123456');
        } catch (error) {
          expect(error).toBeInstanceOf(PortError);
          expect((error as PortError).code).toBe('INVALID_PHONE_NUMBER');
        }
      });
    });

    describe('shouldFailValidation', () => {
      it('有効な番号でもバリデーション失敗を強制できること', async () => {
        // Arrange
        gateway.setShouldFailValidation(true);

        // Act & Assert
        await expect(
          gateway.sendVerificationCode('+81901234567', '123456')
        ).rejects.toThrow(PortError);
      });

      it('バリデーションエラーのコードがINVALID_PHONE_NUMBERであること', async () => {
        gateway.setShouldFailValidation(true);

        try {
          await gateway.sendVerificationCode('+81901234567', '123456');
        } catch (error) {
          expect(error).toBeInstanceOf(PortError);
          expect((error as PortError).code).toBe('INVALID_PHONE_NUMBER');
        }
      });
    });

    describe('shouldFail', () => {
      it('shouldFailがtrueの場合に送信エラーになること', async () => {
        // Arrange
        gateway.setShouldFail(true);

        // Act & Assert
        await expect(
          gateway.sendVerificationCode('+81901234567', '123456')
        ).rejects.toThrow(PortError);
      });

      it('送信エラーのコードがSEND_FAILEDであること', async () => {
        gateway.setShouldFail(true);

        try {
          await gateway.sendVerificationCode('+81901234567', '123456');
        } catch (error) {
          expect(error).toBeInstanceOf(PortError);
          expect((error as PortError).code).toBe('SEND_FAILED');
        }
      });

      it('バリデーションは送信エラーより先に評価されること', async () => {
        // Arrange - 両方のフラグをtrue
        gateway.setShouldFail(true);
        gateway.setShouldFailValidation(true);

        // Act & Assert - バリデーションエラーが先
        try {
          await gateway.sendVerificationCode('+81901234567', '123456');
        } catch (error) {
          expect((error as PortError).code).toBe('INVALID_PHONE_NUMBER');
        }
      });

      it('エラー時にメッセージが保存されないこと', async () => {
        gateway.setShouldFail(true);

        try {
          await gateway.sendVerificationCode('+81901234567', '123456');
        } catch {
          // Expected
        }

        expect(gateway.getSentMessages()).toHaveLength(0);
      });
    });
  });

  // ========================================
  // ヘルパーメソッド テスト
  // ========================================

  describe('clear', () => {
    it('送信済みメッセージをクリアできること', async () => {
      // Arrange
      await gateway.sendVerificationCode('+81901234567', '123456');
      expect(gateway.getSentMessages()).toHaveLength(1);

      // Act
      gateway.clear();

      // Assert
      expect(gateway.getSentMessages()).toHaveLength(0);
    });

    it('shouldFailフラグもリセットされること', async () => {
      // Arrange
      gateway.setShouldFail(true);

      // Act
      gateway.clear();

      // Assert
      await expect(
        gateway.sendVerificationCode('+81901234567', '123456')
      ).resolves.not.toThrow();
    });

    it('shouldFailValidationフラグもリセットされること', async () => {
      // Arrange
      gateway.setShouldFailValidation(true);

      // Act
      gateway.clear();

      // Assert
      await expect(
        gateway.sendVerificationCode('+81901234567', '123456')
      ).resolves.not.toThrow();
    });
  });

  describe('getSentMessages', () => {
    it('空の場合は空配列を返すこと', () => {
      expect(gateway.getSentMessages()).toEqual([]);
    });

    it('送信順に返すこと', async () => {
      await gateway.sendVerificationCode('+1111111111', '111111');
      await gateway.sendVerificationCode('+2222222222', '222222');
      await gateway.sendVerificationCode('+3333333333', '333333');

      const messages = gateway.getSentMessages();
      expect(messages[0].code).toBe('111111');
      expect(messages[1].code).toBe('222222');
      expect(messages[2].code).toBe('333333');
    });

    it('読み取り専用の配列を返すこと', async () => {
      await gateway.sendVerificationCode('+81901234567', '123456');

      const messages = gateway.getSentMessages();
      expect(Array.isArray(messages)).toBe(true);
    });
  });

  describe('setShouldFail', () => {
    it('falseに設定後は正常に送信できること', async () => {
      gateway.setShouldFail(true);
      gateway.setShouldFail(false);

      await expect(
        gateway.sendVerificationCode('+81901234567', '123456')
      ).resolves.not.toThrow();
    });
  });

  describe('setShouldFailValidation', () => {
    it('falseに設定後は正常にバリデーションを通過すること', async () => {
      gateway.setShouldFailValidation(true);
      gateway.setShouldFailValidation(false);

      await expect(
        gateway.sendVerificationCode('+81901234567', '123456')
      ).resolves.not.toThrow();
    });
  });

  // ========================================
  // エッジケース テスト
  // ========================================

  describe('エッジケース', () => {
    it('最短の有効な電話番号で送信できること', async () => {
      // E.164: +国コード(1桁) + 番号(1桁) = 最短2桁
      await gateway.sendVerificationCode('+12', '123456');
      expect(gateway.getSentMessages()).toHaveLength(1);
    });

    it('最長の有効な電話番号で送信できること', async () => {
      // E.164: 最大15桁
      await gateway.sendVerificationCode('+123456789012345', '123456');
      expect(gateway.getSentMessages()).toHaveLength(1);
    });

    it('空の検証コードでも送信できること', async () => {
      // バリデーションはUsecase層の責務
      await gateway.sendVerificationCode('+81901234567', '');
      expect(gateway.getSentMessages()[0].code).toBe('');
    });

    it('長い検証コードでも送信できること', async () => {
      const longCode = '1'.repeat(100);
      await gateway.sendVerificationCode('+81901234567', longCode);
      expect(gateway.getSentMessages()[0].code).toBe(longCode);
    });

    it('同じ電話番号に複数回送信できること', async () => {
      const phone = '+81901234567';
      await gateway.sendVerificationCode(phone, '111111');
      await gateway.sendVerificationCode(phone, '222222');
      await gateway.sendVerificationCode(phone, '333333');

      const messages = gateway.getSentMessages();
      expect(messages).toHaveLength(3);
      expect(messages.filter((m) => m.phoneNumber === phone)).toHaveLength(3);
    });
  });
});
