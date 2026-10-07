-- CreateTable
CREATE TABLE `admin` (
    `admin_id` CHAR(36) NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `email` VARCHAR(255) NOT NULL,
    `password_hash` VARCHAR(255) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `admin_email_key`(`email`),
    PRIMARY KEY (`admin_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `branch` (
    `branch_id` CHAR(36) NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `address` VARCHAR(255) NOT NULL,
    `city` VARCHAR(255) NOT NULL,
    `province` VARCHAR(255) NOT NULL,
    `postal_code` VARCHAR(20) NULL,
    `latitude` DECIMAL(9,6) NULL,
    `longitude` DECIMAL(9,6) NULL,
    `opening_time` TIME NULL,
    `closing_time` TIME NULL,
    `phone` VARCHAR(50) NULL,
    `maps_url` VARCHAR(500) NULL,
    `is_active` BOOLEAN NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `branch_name_key`(`name`),
    PRIMARY KEY (`branch_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `product_category` (
    `category_id` CHAR(36) NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `slug` VARCHAR(255) NOT NULL,
    `display_order` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `product_category_name_key`(`name`),
    UNIQUE INDEX `product_category_slug_key`(`slug`),
    PRIMARY KEY (`category_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `product` (
    `product_id` CHAR(36) NOT NULL,
    `category_id` CHAR(36) NOT NULL,
    `branch_id` CHAR(36) NULL,
    `name` VARCHAR(255) NOT NULL,
    `slug` VARCHAR(255) NOT NULL,
    `description` TEXT NULL,
    `price` DECIMAL(10,2) NOT NULL,
    `image_url` VARCHAR(500) NULL,
    `status` ENUM('ACTIVE','INACTIVE') NOT NULL DEFAULT 'ACTIVE',
    `display_order` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `product_slug_key`(`slug`),
    INDEX `product_category_id_idx`(`category_id`),
    INDEX `product_branch_id_idx`(`branch_id`),
    INDEX `product_status_idx`(`status`),
    INDEX `product_display_order_idx`(`display_order`),
    PRIMARY KEY (`product_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `story` (
    `story_id` CHAR(36) NOT NULL,
    `branch_id` CHAR(36) NULL,
    `title` VARCHAR(255) NOT NULL,
    `slug` VARCHAR(255) NOT NULL,
    `content` TEXT NOT NULL,
    `cover_image_url` VARCHAR(500) NULL,
    `status` ENUM('DRAFT','PUBLISHED','ARCHIVED') NOT NULL DEFAULT 'DRAFT',
    `published_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `story_slug_key`(`slug`),
    INDEX `story_branch_id_idx`(`branch_id`),
    INDEX `story_status_idx`(`status`),
    INDEX `story_published_at_idx`(`published_at`),
    PRIMARY KEY (`story_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `event` (
    `event_id` CHAR(36) NOT NULL,
    `branch_id` CHAR(36) NULL,
    `title` VARCHAR(255) NOT NULL,
    `slug` VARCHAR(255) NOT NULL,
    `description` TEXT NOT NULL,
    `cover_image_url` VARCHAR(500) NULL,
    `event_date` DATE NOT NULL,
    `start_time` TIME NULL,
    `end_time` TIME NULL,
    `status` ENUM('DRAFT','PUBLISHED','ARCHIVED') NOT NULL DEFAULT 'DRAFT',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `event_slug_key`(`slug`),
    INDEX `event_branch_id_idx`(`branch_id`),
    INDEX `event_status_idx`(`status`),
    INDEX `event_event_date_idx`(`event_date`),
    PRIMARY KEY (`event_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `photo_upload` (
    `photo_id` CHAR(36) NOT NULL,
    `branch_id` CHAR(36) NULL,
    `reviewed_by_admin_id` CHAR(36) NULL,
    `visitor_name` VARCHAR(255) NOT NULL,
    `caption` TEXT NULL,
    `image_url` VARCHAR(500) NOT NULL,
    `thumbnail_url` VARCHAR(500) NULL,
    `original_filename` VARCHAR(255) NULL,
    `mime_type` VARCHAR(100) NULL,
    `file_size` BIGINT NULL,
    `status` ENUM('PENDING','APPROVED','REJECTED','HIDDEN') NOT NULL DEFAULT 'PENDING',
    `moderation_note` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `reviewed_at` DATETIME(3) NULL,

    INDEX `photo_upload_branch_id_idx`(`branch_id`),
    INDEX `photo_upload_status_idx`(`status`),
    INDEX `photo_upload_created_at_idx`(`created_at`),
    INDEX `photo_upload_reviewed_by_admin_id_idx`(`reviewed_by_admin_id`),
    PRIMARY KEY (`photo_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `product` ADD FOREIGN KEY (`category_id`) REFERENCES `product_category`(`category_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `product` ADD FOREIGN KEY (`branch_id`) REFERENCES `branch`(`branch_id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `story` ADD FOREIGN KEY (`branch_id`) REFERENCES `branch`(`branch_id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `event` ADD FOREIGN KEY (`branch_id`) REFERENCES `branch`(`branch_id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `photo_upload` ADD FOREIGN KEY (`branch_id`) REFERENCES `branch`(`branch_id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `photo_upload` ADD FOREIGN KEY (`reviewed_by_admin_id`) REFERENCES `admin`(`admin_id`) ON DELETE SET NULL ON UPDATE CASCADE;
