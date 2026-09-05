import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * 用户表新增 tokenVersion（默认 0）：
 * refresh token 的 payload 携带签发时的版本号，refresh 时与库中比对；
 * 登出/改密码时版本 +1，旧 refresh token 全部失效（无需黑名单表）
 */
export class AddUserTokenVersion1756200000000 implements MigrationInterface {
  name = 'AddUserTokenVersion1756200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const rows = (await queryRunner.query(
      `SELECT COUNT(*) AS count FROM information_schema.COLUMNS
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'user' AND COLUMN_NAME = 'tokenVersion'`,
    )) as Array<{ count: string | number }>;
    if (Number(rows[0].count) === 0) {
      await queryRunner.query('ALTER TABLE `user` ADD `tokenVersion` INT NOT NULL DEFAULT 0');
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const rows = (await queryRunner.query(
      `SELECT COUNT(*) AS count FROM information_schema.COLUMNS
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'user' AND COLUMN_NAME = 'tokenVersion'`,
    )) as Array<{ count: string | number }>;
    if (Number(rows[0].count) > 0) {
      await queryRunner.query('ALTER TABLE `user` DROP COLUMN `tokenVersion`');
    }
  }
}
