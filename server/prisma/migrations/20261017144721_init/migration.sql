-- CreateTable
CREATE TABLE `AdminUser` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `username` VARCHAR(64) NOT NULL,
    `passwordHash` VARCHAR(255) NOT NULL,
    `displayName` VARCHAR(120) NULL,
    `failedLoginCount` INTEGER NOT NULL DEFAULT 0,
    `lockedUntil` DATETIME(3) NULL,
    `lastLoginAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `AdminUser_username_key`(`username`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Session` (
    `id` CHAR(64) NOT NULL,
    `userId` INTEGER NOT NULL,
    `csrfToken` VARCHAR(64) NOT NULL,
    `ipAddress` VARCHAR(64) NULL,
    `userAgent` VARCHAR(255) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `lastSeenAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `expiresAt` DATETIME(3) NOT NULL,

    INDEX `Session_userId_idx`(`userId`),
    INDEX `Session_expiresAt_idx`(`expiresAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `FileAsset` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `storageKey` VARCHAR(255) NOT NULL,
    `url` VARCHAR(1024) NOT NULL,
    `originalName` VARCHAR(255) NOT NULL,
    `mimeType` VARCHAR(100) NOT NULL,
    `sizeBytes` INTEGER NOT NULL,
    `width` INTEGER NULL,
    `height` INTEGER NULL,
    `purpose` ENUM('PROJECT_COVER', 'PROJECT_IMAGE', 'CERTIFICATE', 'RESUME', 'PROFILE', 'JOURNEY_DOC') NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `FileAsset_storageKey_key`(`storageKey`),
    INDEX `FileAsset_purpose_createdAt_idx`(`purpose`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Profile` (
    `id` INTEGER NOT NULL DEFAULT 1,
    `fullName` VARCHAR(120) NOT NULL,
    `titles` JSON NOT NULL,
    `introduction` TEXT NOT NULL,
    `objective` VARCHAR(500) NULL,
    `aboutTitle` VARCHAR(160) NOT NULL,
    `aboutBody` TEXT NOT NULL,
    `aboutHighlights` JSON NOT NULL,
    `location` VARCHAR(120) NOT NULL,
    `email` VARCHAR(190) NOT NULL,
    `githubUrl` VARCHAR(255) NULL,
    `linkedinUrl` VARCHAR(255) NULL,
    `profileImageId` INTEGER NULL,
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SiteSettings` (
    `id` INTEGER NOT NULL DEFAULT 1,
    `siteTitle` VARCHAR(160) NOT NULL,
    `siteDescription` VARCHAR(320) NOT NULL,
    `heroHeadline` VARCHAR(200) NOT NULL,
    `heroSubtext` VARCHAR(500) NOT NULL,
    `theme` VARCHAR(32) NOT NULL DEFAULT 'ember',
    `sectionVisibility` JSON NOT NULL,
    `footerText` VARCHAR(300) NOT NULL,
    `showResumeButton` BOOLEAN NOT NULL DEFAULT true,
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Tag` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(60) NOT NULL,
    `slug` VARCHAR(80) NOT NULL,

    UNIQUE INDEX `Tag_name_key`(`name`),
    UNIQUE INDEX `Tag_slug_key`(`slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Project` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `slug` VARCHAR(120) NOT NULL,
    `title` VARCHAR(160) NOT NULL,
    `tagline` VARCHAR(200) NULL,
    `shortDescription` VARCHAR(320) NOT NULL,
    `description` TEXT NOT NULL,
    `category` VARCHAR(80) NOT NULL,
    `status` ENUM('CONCEPT', 'IN_PROGRESS', 'LIVE_DEMO', 'COMPLETED', 'ARCHIVED') NOT NULL DEFAULT 'IN_PROGRESS',
    `githubUrl` VARCHAR(500) NULL,
    `liveUrl` VARCHAR(500) NULL,
    `features` JSON NOT NULL,
    `challenges` JSON NOT NULL,
    `lessonsLearned` TEXT NULL,
    `publishedAt` DATETIME(3) NULL,
    `isFeatured` BOOLEAN NOT NULL DEFAULT false,
    `isPublished` BOOLEAN NOT NULL DEFAULT false,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `coverImageId` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Project_slug_key`(`slug`),
    INDEX `Project_isPublished_sortOrder_idx`(`isPublished`, `sortOrder`),
    INDEX `Project_isFeatured_isPublished_idx`(`isFeatured`, `isPublished`),
    INDEX `Project_category_idx`(`category`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ProjectImage` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `projectId` INTEGER NOT NULL,
    `assetId` INTEGER NOT NULL,
    `altText` VARCHAR(200) NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,

    INDEX `ProjectImage_projectId_sortOrder_idx`(`projectId`, `sortOrder`),
    UNIQUE INDEX `ProjectImage_projectId_assetId_key`(`projectId`, `assetId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ProjectTag` (
    `projectId` INTEGER NOT NULL,
    `tagId` INTEGER NOT NULL,

    INDEX `ProjectTag_tagId_idx`(`tagId`),
    PRIMARY KEY (`projectId`, `tagId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SkillCategory` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(80) NOT NULL,
    `description` VARCHAR(300) NULL,
    `icon` VARCHAR(32) NOT NULL DEFAULT 'code',
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `isVisible` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `SkillCategory_name_key`(`name`),
    INDEX `SkillCategory_isVisible_sortOrder_idx`(`isVisible`, `sortOrder`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Skill` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `categoryId` INTEGER NOT NULL,
    `name` VARCHAR(80) NOT NULL,
    `note` VARCHAR(80) NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `isVisible` BOOLEAN NOT NULL DEFAULT true,

    INDEX `Skill_categoryId_sortOrder_idx`(`categoryId`, `sortOrder`),
    UNIQUE INDEX `Skill_categoryId_name_key`(`categoryId`, `name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Certificate` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `title` VARCHAR(200) NOT NULL,
    `issuer` VARCHAR(160) NOT NULL,
    `issueDate` DATE NULL,
    `credentialId` VARCHAR(120) NULL,
    `verificationUrl` VARCHAR(500) NULL,
    `description` TEXT NULL,
    `category` VARCHAR(80) NOT NULL,
    `fileId` INTEGER NULL,
    `thumbnailId` INTEGER NULL,
    `isFeatured` BOOLEAN NOT NULL DEFAULT false,
    `isPublished` BOOLEAN NOT NULL DEFAULT false,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Certificate_isPublished_sortOrder_idx`(`isPublished`, `sortOrder`),
    INDEX `Certificate_category_idx`(`category`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ExperienceEntry` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `type` ENUM('TRAINING', 'INTERNSHIP', 'WORKSHOP', 'WEBINAR', 'DEVELOPMENT', 'LEADERSHIP', 'EMPLOYMENT', 'EDUCATION', 'OTHER') NOT NULL,
    `title` VARCHAR(200) NOT NULL,
    `organization` VARCHAR(160) NOT NULL,
    `role` VARCHAR(160) NULL,
    `location` VARCHAR(120) NULL,
    `startDate` DATE NULL,
    `endDate` DATE NULL,
    `isCurrent` BOOLEAN NOT NULL DEFAULT false,
    `description` TEXT NULL,
    `documentId` INTEGER NULL,
    `isPublished` BOOLEAN NOT NULL DEFAULT false,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `ExperienceEntry_isPublished_sortOrder_idx`(`isPublished`, `sortOrder`),
    INDEX `ExperienceEntry_type_idx`(`type`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ExperienceTag` (
    `entryId` INTEGER NOT NULL,
    `tagId` INTEGER NOT NULL,

    INDEX `ExperienceTag_tagId_idx`(`tagId`),
    PRIMARY KEY (`entryId`, `tagId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ResumeAsset` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `assetId` INTEGER NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT false,
    `uploadedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ResumeAsset_isActive_uploadedAt_idx`(`isActive`, `uploadedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ContactMessage` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(120) NOT NULL,
    `email` VARCHAR(190) NOT NULL,
    `subject` VARCHAR(200) NOT NULL,
    `message` TEXT NOT NULL,
    `isRead` BOOLEAN NOT NULL DEFAULT false,
    `ipHash` CHAR(64) NULL,
    `emailStatus` ENUM('NOT_CONFIGURED', 'SENT', 'FAILED') NOT NULL DEFAULT 'NOT_CONFIGURED',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ContactMessage_isRead_createdAt_idx`(`isRead`, `createdAt`),
    INDEX `ContactMessage_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Session` ADD CONSTRAINT `Session_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `AdminUser`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Profile` ADD CONSTRAINT `Profile_profileImageId_fkey` FOREIGN KEY (`profileImageId`) REFERENCES `FileAsset`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Project` ADD CONSTRAINT `Project_coverImageId_fkey` FOREIGN KEY (`coverImageId`) REFERENCES `FileAsset`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProjectImage` ADD CONSTRAINT `ProjectImage_projectId_fkey` FOREIGN KEY (`projectId`) REFERENCES `Project`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProjectImage` ADD CONSTRAINT `ProjectImage_assetId_fkey` FOREIGN KEY (`assetId`) REFERENCES `FileAsset`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProjectTag` ADD CONSTRAINT `ProjectTag_projectId_fkey` FOREIGN KEY (`projectId`) REFERENCES `Project`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProjectTag` ADD CONSTRAINT `ProjectTag_tagId_fkey` FOREIGN KEY (`tagId`) REFERENCES `Tag`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Skill` ADD CONSTRAINT `Skill_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `SkillCategory`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Certificate` ADD CONSTRAINT `Certificate_fileId_fkey` FOREIGN KEY (`fileId`) REFERENCES `FileAsset`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Certificate` ADD CONSTRAINT `Certificate_thumbnailId_fkey` FOREIGN KEY (`thumbnailId`) REFERENCES `FileAsset`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ExperienceEntry` ADD CONSTRAINT `ExperienceEntry_documentId_fkey` FOREIGN KEY (`documentId`) REFERENCES `FileAsset`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ExperienceTag` ADD CONSTRAINT `ExperienceTag_entryId_fkey` FOREIGN KEY (`entryId`) REFERENCES `ExperienceEntry`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ExperienceTag` ADD CONSTRAINT `ExperienceTag_tagId_fkey` FOREIGN KEY (`tagId`) REFERENCES `Tag`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ResumeAsset` ADD CONSTRAINT `ResumeAsset_assetId_fkey` FOREIGN KEY (`assetId`) REFERENCES `FileAsset`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
