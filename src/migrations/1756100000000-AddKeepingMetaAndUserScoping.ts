import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * 记账元数据扩展 + 用户归属隔离：
 *  1. keeping 增加 currency / tags / longitude / latitude —— 客户端同步时已在发送
 *     tags 和币种信息，但此前服务端没有对应列，字段被 ValidationPipe whitelist 丢弃；
 *     经纬度为地图选点预留（客户端目前只上报地址名）
 *  2. analysis / category 增加 createUserId —— 此前这两张表是全局共享的，
 *     任何登录用户都能看到/改到所有人的数据；补上归属列后按用户过滤
 *  3. keeping 增加 (createUserId, createTime) 索引 —— 统计接口按用户 + 时间范围聚合
 *
 * 全部写成幂等形式（information_schema 先判断再 ALTER），与基线迁移策略一致
 */
export class AddKeepingMetaAndUserScoping1756100000000 implements MigrationInterface {
  name = 'AddKeepingMetaAndUserScoping1756100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    if (!(await this.hasColumn(queryRunner, 'keeping', 'currency'))) {
      await queryRunner.query('ALTER TABLE `keeping` ADD `currency` VARCHAR(16) NULL');
    }
    if (!(await this.hasColumn(queryRunner, 'keeping', 'tags'))) {
      await queryRunner.query('ALTER TABLE `keeping` ADD `tags` VARCHAR(255) NULL');
    }
    if (!(await this.hasColumn(queryRunner, 'keeping', 'longitude'))) {
      await queryRunner.query('ALTER TABLE `keeping` ADD `longitude` DOUBLE NULL');
    }
    if (!(await this.hasColumn(queryRunner, 'keeping', 'latitude'))) {
      await queryRunner.query('ALTER TABLE `keeping` ADD `latitude` DOUBLE NULL');
    }
    if (!(await this.hasIndex(queryRunner, 'keeping', 'idx_keeping_user_create_time'))) {
      await queryRunner.query(
        'CREATE INDEX `idx_keeping_user_create_time` ON `keeping` (`createUserId`, `createTime`)',
      );
    }

    if (!(await this.hasColumn(queryRunner, 'analysis', 'createUserId'))) {
      await queryRunner.query('ALTER TABLE `analysis` ADD `createUserId` DOUBLE NULL');
    }
    if (!(await this.hasColumn(queryRunner, 'category', 'createUserId'))) {
      await queryRunner.query('ALTER TABLE `category` ADD `createUserId` DOUBLE NULL');
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    if (await this.hasIndex(queryRunner, 'keeping', 'idx_keeping_user_create_time')) {
      await queryRunner.query('DROP INDEX `idx_keeping_user_create_time` ON `keeping`');
    }
    if (await this.hasColumn(queryRunner, 'category', 'createUserId')) {
      await queryRunner.query('ALTER TABLE `category` DROP COLUMN `createUserId`');
    }
    if (await this.hasColumn(queryRunner, 'analysis', 'createUserId')) {
      await queryRunner.query('ALTER TABLE `analysis` DROP COLUMN `createUserId`');
    }
    for (const column of ['latitude', 'longitude', 'tags', 'currency']) {
      if (await this.hasColumn(queryRunner, 'keeping', column)) {
        await queryRunner.query(`ALTER TABLE \`keeping\` DROP COLUMN \`${column}\``);
      }
    }
  }

  private async hasColumn(queryRunner: QueryRunner, table: string, column: string): Promise<boolean> {
    const rows = (await queryRunner.query(
      `SELECT COUNT(*) AS count FROM information_schema.COLUMNS
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
      [table, column],
    )) as Array<{ count: string | number }>;
    return Number(rows[0].count) > 0;
  }

  private async hasIndex(queryRunner: QueryRunner, table: string, index: string): Promise<boolean> {
    const rows = (await queryRunner.query(
      `SELECT COUNT(*) AS count FROM information_schema.STATISTICS
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND INDEX_NAME = ?`,
      [table, index],
    )) as Array<{ count: string | number }>;
    return Number(rows[0].count) > 0;
  }
}
