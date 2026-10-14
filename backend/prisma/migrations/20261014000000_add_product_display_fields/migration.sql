-- AlterTable: add display visibility and best seller to Product
ALTER TABLE `product` ADD COLUMN `is_visible` BOOLEAN NOT NULL DEFAULT 1;
ALTER TABLE `product` ADD COLUMN `is_best_seller` BOOLEAN NOT NULL DEFAULT 0;
CREATE INDEX `product_is_visible_idx` ON `product` (`is_visible`);
