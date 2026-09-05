import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * 基线迁移：建出全部表结构（含软删除列和索引）。
 *
 * 写成幂等形式，是为了同时适配两种数据库：
 *  1. 全新数据库 —— 走 CREATE TABLE IF NOT EXISTS，一步到位
 *  2. 旧的 synchronize=true 开发库 —— 表已存在，只补齐缺失的列 / 索引，
 *     存量数据不受影响（MySQL 不支持 ADD COLUMN IF NOT EXISTS，所以先用 information_schema 查）
 *
 * 注意：本项目从 synchronize 切换到 migration 模式以此文件为基线，
 * 之后的结构变更一律 `npm run migration:generate -- src/migrations/<名称>` 生成新迁移。
 */
export class InitSchema1755300000000 implements MigrationInterface {
  name = 'InitSchema1755300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ---- 全新库：一次性建表（列类型与实体定义对齐，裸 number 列 TypeORM 默认映射为 double）----
    await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS \`user\` (
                \`id\` INT NOT NULL AUTO_INCREMENT,
                \`username\` VARCHAR(255) NOT NULL,
                \`age\` DOUBLE NOT NULL,
                \`password\` VARCHAR(255) NOT NULL,
                \`isActive\` TINYINT NOT NULL DEFAULT 1,
                \`createTime\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                \`avatar\` VARCHAR(255) NULL,
                PRIMARY KEY (\`id\`)
            ) ENGINE = InnoDB
        `);

    await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS \`keeping\` (
                \`id\` INT NOT NULL AUTO_INCREMENT,
                \`localId\` VARCHAR(255) NULL,
                \`createUserId\` DOUBLE NOT NULL,
                \`name\` VARCHAR(255) NOT NULL,
                \`transactionType\` DOUBLE NOT NULL,
                \`category\` DOUBLE NULL,
                \`amount\` DOUBLE NOT NULL,
                \`position\` VARCHAR(255) NULL,
                \`image\` VARCHAR(255) NULL,
                \`remark\` VARCHAR(255) NULL,
                \`createTime\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                \`updateTime\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
                \`deleteAt\` DATETIME(6) NULL,
                PRIMARY KEY (\`id\`),
                INDEX \`idx_keeping_user_update_time\` (\`createUserId\`, \`updateTime\`),
                INDEX \`idx_keeping_user_local_id\` (\`createUserId\`, \`localId\`)
            ) ENGINE = InnoDB
        `);

    await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS \`category\` (
                \`id\` INT NOT NULL AUTO_INCREMENT,
                \`name\` VARCHAR(255) NOT NULL,
                \`icon\` VARCHAR(255) NULL,
                \`deleteAt\` DATETIME(6) NULL,
                PRIMARY KEY (\`id\`)
            ) ENGINE = InnoDB
        `);

    await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS \`analysis\` (
                \`id\` INT NOT NULL AUTO_INCREMENT,
                \`name\` VARCHAR(100) NOT NULL COMMENT '名称',
                \`content\` TEXT NOT NULL COMMENT '内容',
                \`reasoningContent\` TEXT NULL COMMENT '分析过程',
                \`createTime\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
                \`updateTime\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '更新时间',
                \`deleteAt\` DATETIME(6) NULL,
                \`keepingId\` INT NULL,
                PRIMARY KEY (\`id\`),
                INDEX \`FK_analysis_keepingId\` (\`keepingId\`),
                CONSTRAINT \`FK_analysis_keepingId\` FOREIGN KEY (\`keepingId\`) REFERENCES \`keeping\` (\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION
            ) ENGINE = InnoDB
        `);

    await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS \`file\` (
                \`id\` INT NOT NULL AUTO_INCREMENT,
                \`filename\` VARCHAR(255) NOT NULL,
                \`originalname\` VARCHAR(255) NOT NULL,
                \`size\` DOUBLE NOT NULL,
                \`mimetype\` VARCHAR(255) NOT NULL,
                \`filepath\` VARCHAR(500) NOT NULL COMMENT '文件路径',
                \`userId\` INT NULL,
                \`createTime\` DATETIME(6) NULL DEFAULT CURRENT_TIMESTAMP(6),
                PRIMARY KEY (\`id\`),
                INDEX \`FK_file_userId\` (\`userId\`),
                CONSTRAINT \`FK_file_userId\` FOREIGN KEY (\`userId\`) REFERENCES \`user\` (\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION
            ) ENGINE = InnoDB
        `);

    // ---- 旧开发库：只补缺失的软删除列 ----
    if (!(await this.hasColumn(queryRunner, 'keeping', 'deleteAt'))) {
      await queryRunner.query('ALTER TABLE `keeping` ADD `deleteAt` DATETIME(6) NULL');
    }
    if (!(await this.hasColumn(queryRunner, 'category', 'deleteAt'))) {
      await queryRunner.query('ALTER TABLE `category` ADD `deleteAt` DATETIME(6) NULL');
    }
    if (!(await this.hasColumn(queryRunner, 'analysis', 'deleteAt'))) {
      await queryRunner.query('ALTER TABLE `analysis` ADD `deleteAt` DATETIME(6) NULL');
    }

    // ---- 旧开发库：补缺失的索引 ----
    // 同步接口按 (createUserId, updateTime) 增量拉取变更，这是全项目最高的查询路径
    if (!(await this.hasIndex(queryRunner, 'keeping', 'idx_keeping_user_update_time'))) {
      await queryRunner.query(
        'CREATE INDEX `idx_keeping_user_update_time` ON `keeping` (`createUserId`, `updateTime`)',
      );
    }
    // 同步时按 (createUserId, localId) 反查新建记录做 ID 映射
    if (!(await this.hasIndex(queryRunner, 'keeping', 'idx_keeping_user_local_id'))) {
      await queryRunner.query('CREATE INDEX `idx_keeping_user_local_id` ON `keeping` (`createUserId`, `localId`)');
    }
    // username 唯一索引：注册查重的并发竞态由数据库兜底。
    // 若存量数据已有重复 username，这里会失败 —— 先人工去重再重跑迁移
    if (!(await this.hasIndex(queryRunner, 'user', 'idx_user_username_unique'))) {
      await queryRunner.query('CREATE UNIQUE INDEX `idx_user_username_unique` ON `user` (`username`)');
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // 基线迁移的回滚 = 删库，只能用于本地 / 测试环境
    await queryRunner.query('DROP TABLE IF EXISTS `file`');
    await queryRunner.query('DROP TABLE IF EXISTS `analysis`');
    await queryRunner.query('DROP TABLE IF EXISTS `category`');
    await queryRunner.query('DROP TABLE IF EXISTS `keeping`');
    await queryRunner.query('DROP TABLE IF EXISTS `user`');
  }

  /** information_schema 查列是否存在（MySQL 没有 ADD COLUMN IF NOT EXISTS，靠这个实现幂等） */
  private async hasColumn(queryRunner: QueryRunner, table: string, column: string): Promise<boolean> {
    const rows = (await queryRunner.query(
      `SELECT COUNT(*) AS count FROM information_schema.COLUMNS
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
      [table, column],
    )) as Array<{ count: string | number }>;
    return Number(rows[0].count) > 0;
  }

  /** information_schema 查索引是否存在 */
  private async hasIndex(queryRunner: QueryRunner, table: string, index: string): Promise<boolean> {
    const rows = (await queryRunner.query(
      `SELECT COUNT(*) AS count FROM information_schema.STATISTICS
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND INDEX_NAME = ?`,
      [table, index],
    )) as Array<{ count: string | number }>;
    return Number(rows[0].count) > 0;
  }
}
