-- CreateTable: section-based landing page image configuration (8th core entity).
-- Additive only. No existing table, column, index, or row is modified.
-- Authorization: AI-Memory Decisions.md ("Website Content Images - SiteImage")
-- and Database.md ("Entity: SiteImage").
--
-- `single_slot_key` is a MySQL 8 generated column backing database-level
-- uniqueness for single-image slots. It equals `slot_key` for hero/brand_story
-- and is NULL for atmosphere, so the unique index below allows at most one row
-- per (section_key, slot_key) for single slots while leaving the gallery
-- unrestricted (NULL values are exempt from a MySQL UNIQUE index).
CREATE TABLE `site_image` (
    `site_image_id` CHAR(36) NOT NULL,
    `section_key` VARCHAR(50) NOT NULL,
    `slot_key` VARCHAR(50) NOT NULL,
    `image_url` VARCHAR(500) NOT NULL,
    `alt_text` VARCHAR(255) NULL,
    `display_order` INTEGER NOT NULL DEFAULT 0,
    `is_visible` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `single_slot_key` VARCHAR(50) GENERATED ALWAYS AS (IF(`section_key` IN ('hero', 'brand_story'), `slot_key`, NULL)) STORED,

    INDEX `site_image_section_key_is_visible_display_order_idx`(`section_key`, `is_visible`, `display_order`),
    INDEX `site_image_section_key_slot_key_idx`(`section_key`, `slot_key`),
    UNIQUE INDEX `site_image_single_slot_uq`(`section_key`, `single_slot_key`),
    PRIMARY KEY (`site_image_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
