-- AlterTable: add the session-revocation counter to Admin (H-2).
-- Additive only. No existing column, index, or row is modified, so MySQL/MariaDB
-- backfills every existing admin with 0 rather than failing on a NOT NULL column.
--
-- `token_version` is included in the JWT as `ver` and compared against this
-- column on every authenticated request. Logout and password rotation increment
-- it, which invalidates every token previously issued to that admin. Tokens
-- without a `ver` claim (issued before this deploy) are rejected by the guard.
ALTER TABLE `admin` ADD COLUMN `token_version` INTEGER NOT NULL DEFAULT 0;
