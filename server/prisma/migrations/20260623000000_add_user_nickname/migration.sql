ALTER TABLE `User` ADD COLUMN `nickname` VARCHAR(32) NOT NULL DEFAULT '';

UPDATE `User` SET `nickname` = `username` WHERE `nickname` = '';

ALTER TABLE `User` ALTER `nickname` DROP DEFAULT;
