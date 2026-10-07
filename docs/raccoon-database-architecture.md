# Raccoon Coffee --- Database Architecture

## Status

**ERD:** Final / Locked v1.0\
**Database:** MySQL / MariaDB\
**ORM:** Prisma\
**Architecture scope:** Website content management + Raccoon Wall
community uploads

This document is the database source of truth for AI agents working on
the Raccoon Coffee website.

------------------------------------------------------------------------

## 1. Business Context

Raccoon Coffee is a modern coffee shop and hangout space. The website is
not only a static company profile. It contains:

-   Coffee and food menu
-   Brand stories
-   Events and activities
-   Branch/location information
-   A community-driven photo wall called **Raccoon Wall**

Visitors can upload photos of their experience at Raccoon without
creating an account.

The database must remain intentionally simple. Do not introduce
e-commerce or customer-account entities unless the project requirements
explicitly change.

------------------------------------------------------------------------

# 2. Technology Decisions

## Database

Use:

-   MySQL or MariaDB
-   Prisma ORM

Do **not** use PostgreSQL for this project.

## Primary Keys

Use UUID for all primary keys.

## Money

Use `DECIMAL` for monetary values.

## Timestamps

Use timestamp fields for auditing and content lifecycle tracking.

------------------------------------------------------------------------

# 3. Core Entities

The final database contains exactly these seven core entities:

1.  `Admin`
2.  `Branch`
3.  `ProductCategory`
4.  `Product`
5.  `Story`
6.  `Event`
7.  `PhotoUpload`

Do not add speculative entities.

Especially do not create:

-   User
-   Customer
-   Visitor
-   Order
-   Cart
-   Payment
-   Review
-   Comment
-   Wishlist

Visitors are anonymous.

------------------------------------------------------------------------

# 4. Entity: Admin

Represents authorized Raccoon administrators.

### Fields

  Field             Type        Constraints
  ----------------- ----------- ------------------
  `admin_id`        UUID        PK
  `name`            VARCHAR     NOT NULL
  `email`           VARCHAR     NOT NULL, UNIQUE
  `password_hash`   VARCHAR     NOT NULL
  `created_at`      TIMESTAMP   NOT NULL
  `updated_at`      TIMESTAMP   NOT NULL

### Responsibilities

Admins can:

-   Manage products
-   Manage product categories
-   Manage stories
-   Manage events
-   Moderate visitor photo submissions

### Relationships

``` text
Admin 1 ─── N PhotoUpload
```

An admin can review many photo submissions.

A photo submission can have zero or one reviewing admin.

------------------------------------------------------------------------

# 5. Entity: Branch

Represents a Raccoon physical location.

The current business may have only one location, but the schema must
support future expansion to multiple branches.

### Fields

  Field            Type        Constraints
  ---------------- ----------- ------------------
  `branch_id`      UUID        PK
  `name`           VARCHAR     NOT NULL, UNIQUE
  `address`        VARCHAR     NOT NULL
  `city`           VARCHAR     NOT NULL
  `province`       VARCHAR     NOT NULL
  `postal_code`    VARCHAR     NULLABLE
  `latitude`       DECIMAL     NULLABLE
  `longitude`      DECIMAL     NULLABLE
  `opening_time`   TIME        NULLABLE
  `closing_time`   TIME        NULLABLE
  `phone`          VARCHAR     NULLABLE
  `maps_url`       VARCHAR     NULLABLE
  `is_active`      BOOLEAN     NOT NULL
  `created_at`     TIMESTAMP   NOT NULL
  `updated_at`     TIMESTAMP   NOT NULL

### Relationships

``` text
Branch 1 ─── N Product
Branch 1 ─── N Story
Branch 1 ─── N Event
Branch 1 ─── N PhotoUpload
```

All child `branch_id` fields are nullable.

Reason: some content may be global to the Raccoon brand rather than tied
to one branch.

------------------------------------------------------------------------

# 6. Entity: ProductCategory

Represents menu categories.

Examples:

-   Coffee
-   Non-Coffee
-   Food
-   Snack

### Fields

  Field             Type        Constraints
  ----------------- ----------- ------------------
  `category_id`     UUID        PK
  `name`            VARCHAR     NOT NULL, UNIQUE
  `slug`            VARCHAR     NOT NULL, UNIQUE
  `display_order`   INT         NOT NULL
  `created_at`      TIMESTAMP   NOT NULL
  `updated_at`      TIMESTAMP   NOT NULL

### Relationships

``` text
ProductCategory 1 ─── N Product
```

Every product must belong to exactly one category.

------------------------------------------------------------------------

# 7. Entity: Product

Represents menu items.

### Fields

  Field             Type            Constraints
  ----------------- --------------- ------------------
  `product_id`      UUID            PK
  `category_id`     UUID            FK, NOT NULL
  `branch_id`       UUID            FK, NULLABLE
  `name`            VARCHAR         NOT NULL
  `slug`            VARCHAR         NOT NULL, UNIQUE
  `description`     TEXT            NULLABLE
  `price`           DECIMAL         NOT NULL
  `image_url`       VARCHAR         NULLABLE
  `status`          ProductStatus   NOT NULL
  `display_order`   INT             NOT NULL
  `created_at`      TIMESTAMP       NOT NULL
  `updated_at`      TIMESTAMP       NOT NULL

### Important Rule

`description` is nullable.

A product does not need a description.

### ProductStatus

``` text
ACTIVE
INACTIVE
```

### Relationships

``` text
ProductCategory 1 ─── N Product
Branch 1 ─── N Product
```

### Branch behavior

`branch_id` is nullable.

A product with `branch_id = NULL` may be treated as a global product
available across branches, depending on application logic.

------------------------------------------------------------------------

# 8. Entity: Story

Represents brand stories and editorial content.

### Fields

  Field               Type            Constraints
  ------------------- --------------- ------------------
  `story_id`          UUID            PK
  `branch_id`         UUID            FK, NULLABLE
  `title`             VARCHAR         NOT NULL
  `slug`              VARCHAR         NOT NULL, UNIQUE
  `content`           TEXT            NOT NULL
  `cover_image_url`   VARCHAR         NULLABLE
  `status`            ContentStatus   NOT NULL
  `published_at`      TIMESTAMP       NULLABLE
  `created_at`        TIMESTAMP       NOT NULL
  `updated_at`        TIMESTAMP       NOT NULL

### ContentStatus

``` text
DRAFT
PUBLISHED
ARCHIVED
```

### Relationships

``` text
Branch 1 ─── N Story
```

`branch_id` is nullable because a story may represent the Raccoon brand
as a whole.

------------------------------------------------------------------------

# 9. Entity: Event

Represents events and activities at Raccoon.

### Fields

  Field               Type            Constraints
  ------------------- --------------- ------------------
  `event_id`          UUID            PK
  `branch_id`         UUID            FK, NULLABLE
  `title`             VARCHAR         NOT NULL
  `slug`              VARCHAR         NOT NULL, UNIQUE
  `description`       TEXT            NOT NULL
  `cover_image_url`   VARCHAR         NULLABLE
  `event_date`        DATE            NOT NULL
  `start_time`        TIME            NULLABLE
  `end_time`          TIME            NULLABLE
  `status`            ContentStatus   NOT NULL
  `created_at`        TIMESTAMP       NOT NULL
  `updated_at`        TIMESTAMP       NOT NULL

### ContentStatus

``` text
DRAFT
PUBLISHED
ARCHIVED
```

### Relationships

``` text
Branch 1 ─── N Event
```

`branch_id` is nullable because an event may be brand-wide or
branch-specific.

------------------------------------------------------------------------

# 10. Entity: PhotoUpload

Represents anonymous visitor photo submissions for the **Raccoon Wall**.

This is one of the core interactive features of the website.

Visitors do not need accounts.

### Fields

  Field                    Type          Constraints
  ------------------------ ------------- --------------
  `photo_id`               UUID          PK
  `branch_id`              UUID          FK, NULLABLE
  `reviewed_by_admin_id`   UUID          FK, NULLABLE
  `visitor_name`           VARCHAR       NOT NULL
  `caption`                TEXT          NULLABLE
  `image_url`              VARCHAR       NOT NULL
  `thumbnail_url`          VARCHAR       NULLABLE
  `original_filename`      VARCHAR       NULLABLE
  `mime_type`              VARCHAR       NULLABLE
  `file_size`              BIGINT        NULLABLE
  `status`                 PhotoStatus   NOT NULL
  `moderation_note`        TEXT          NULLABLE
  `created_at`             TIMESTAMP     NOT NULL
  `updated_at`             TIMESTAMP     NOT NULL
  `reviewed_at`            TIMESTAMP     NULLABLE

### PhotoStatus

``` text
PENDING
APPROVED
REJECTED
HIDDEN
```

### Moderation Flow

``` text
Visitor
   │
   │ Upload photo
   ▼
PENDING
   │
   ├──────────────► REJECTED
   │
   ▼
APPROVED
   │
   ▼
Public Raccoon Wall
   │
   ▼
HIDDEN
```

### Business Rules

1.  Every new photo starts as `PENDING`.
2.  `PENDING` photos are not publicly visible.
3.  An admin can approve or reject a photo.
4.  `APPROVED` photos can appear on the public Raccoon Wall.
5.  `REJECTED` photos must not appear publicly.
6.  `HIDDEN` is used when an already-approved photo is removed from
    public display.
7.  A photo can be reviewed by zero or one admin.
8.  One admin can review many photos.
9.  `branch_id` is nullable.
10. Do not create a visitor/customer/user entity.

### Relationships

``` text
Branch 1 ─── N PhotoUpload
Admin  1 ─── N PhotoUpload
```

------------------------------------------------------------------------

# 11. Complete Relationship Map

``` text
ProductCategory
      │
      │ 1:N
      ▼
   Product
      ▲
      │ N:1
      │
    Branch
   /   |   \
  /    |    \
 ▼     ▼     ▼
Story Event PhotoUpload
               ▲
               │ N:1
               │
             Admin
```

More explicitly:

``` text
ProductCategory 1 ─── N Product

Branch 1 ─── N Product

Branch 1 ─── N Story

Branch 1 ─── N Event

Branch 1 ─── N PhotoUpload

Admin 1 ─── N PhotoUpload
```

------------------------------------------------------------------------

# 12. Foreign Keys

The following FK relationships are mandatory in the implementation:

``` text
Product.category_id
    → ProductCategory.category_id

Product.branch_id
    → Branch.branch_id

Story.branch_id
    → Branch.branch_id

Event.branch_id
    → Branch.branch_id

PhotoUpload.branch_id
    → Branch.branch_id

PhotoUpload.reviewed_by_admin_id
    → Admin.admin_id
```

Nullable FKs:

``` text
Product.branch_id
Story.branch_id
Event.branch_id
PhotoUpload.branch_id
PhotoUpload.reviewed_by_admin_id
```

------------------------------------------------------------------------

# 13. Unique Constraints

The following values must be unique:

``` text
Admin.email

Branch.name

ProductCategory.name
ProductCategory.slug

Product.slug

Story.slug

Event.slug
```

Do not make image URLs unique.

------------------------------------------------------------------------

# 14. Recommended Indexes

The Prisma implementation should add useful indexes for common queries.

Recommended:

``` text
Product
- category_id
- branch_id
- status
- display_order

Story
- branch_id
- status
- published_at

Event
- branch_id
- status
- event_date

PhotoUpload
- branch_id
- status
- created_at
- reviewed_by_admin_id

Admin
- email

ProductCategory
- slug
```

Do not blindly create indexes on every field. Add indexes based on
actual query patterns.

------------------------------------------------------------------------

# 15. Content Lifecycle

## Product

``` text
ACTIVE
INACTIVE
```

## Story

``` text
DRAFT
PUBLISHED
ARCHIVED
```

## Event

``` text
DRAFT
PUBLISHED
ARCHIVED
```

## PhotoUpload

``` text
PENDING
APPROVED
REJECTED
HIDDEN
```

Do not add `deleted_at` to every table automatically.

Use explicit lifecycle/status fields where appropriate.

------------------------------------------------------------------------

# 16. Data Modeling Principles

The implementation must follow these principles:

-   Keep the schema normalized.
-   Avoid duplicate relational information.
-   Use foreign keys rather than duplicated names.
-   Do not store relational structures as JSON.
-   Do not create unnecessary junction tables.
-   Do not introduce authentication for anonymous visitors.
-   Keep global content separate from branch-specific content through
    nullable `branch_id`.
-   Keep the database minimal and focused on the actual website
    requirements.

------------------------------------------------------------------------

# 17. Explicit Scope Boundaries

This database is for a coffee shop website and community/content
experience.

It is NOT currently an e-commerce system.

Do not implement database entities for:

-   Shopping carts
-   Orders
-   Payments
-   Customers
-   Product reviews
-   Customer accounts
-   Loyalty programs
-   Reservations
-   Inventory
-   Delivery
-   POS transactions

These can be introduced later only if the product requirements
explicitly expand.

------------------------------------------------------------------------

# 18. Performance & Resource Principles

The Raccoon website should be designed to minimize unnecessary database load, server CPU/RAM usage, storage consumption, and network bandwidth.

These principles are architectural constraints and should be considered during backend, frontend, API, storage, and database implementation.

1. Binary image files MUST NOT be stored directly in MySQL/MariaDB.
2. The database MUST store only image metadata and storage URLs/references.
3. Public images SHOULD use optimized WebP or AVIF formats where supported.
4. Uploaded images SHOULD have generated optimized variants, such as thumbnail and display-size images. Original images should be retained only when required.
5. Public gallery endpoints MUST use pagination or cursor-based pagination.
6. Public APIs MUST return only the fields required by the client.
7. Admin-only moderation metadata MUST NOT be returned by public endpoints.
8. Public images MUST use lazy loading where appropriate.
9. Frequently accessed and rarely changing content SHOULD be cacheable.
10. Application queries MUST avoid SELECT * and retrieve only required columns.
11. Database indexes SHOULD be based on actual query patterns and access patterns.
12. Do NOT introduce dedicated caching infrastructure until there is a measurable need, unless the selected framework already provides an appropriate caching mechanism naturally.
13. Original uploaded images SHOULD be retained only when required by a business or operational requirement.
14. Large image uploads SHOULD be validated and optimized before being made publicly accessible.
15. API responses SHOULD avoid unnecessarily large payloads.
16. Public content such as products, stories, events, branches, and approved Raccoon Wall photos SHOULD support caching and efficient repeated reads.
17. The Raccoon Wall MUST prioritize optimized image variants instead of serving original high-resolution uploads to normal visitors.
18. The application SHOULD prevent unbounded queries. Collection endpoints MUST define reasonable pagination limits.
19. Performance optimizations MUST NOT compromise the database architecture or introduce unnecessary infrastructure prematurely.
20. Prefer simple, measurable optimizations over speculative complexity.

## Image Storage Architecture

The intended image flow is:

Visitor
→ Upload
→ Validate
→ Optimize / Resize
→ Object Storage
→ Store metadata + URLs in MySQL/MariaDB
→ Serve optimized image through CDN or cache layer when available

The database is NOT an image storage system.

## Public Raccoon Wall

The public Raccoon Wall should normally retrieve:

- photo ID
- optimized image URL
- thumbnail URL when needed
- visitor display name
- caption
- created timestamp

The public API must NOT expose:

- moderation note
- reviewer admin ID
- original filename
- internal moderation metadata
- unnecessary file metadata

unless explicitly required by a future feature.

## Performance Principle

Do not optimize prematurely by adding unnecessary infrastructure.

The preferred order is:

1. Efficient database schema
2. Correct indexes
3. Minimal API payloads
4. Image optimization
5. Pagination
6. Lazy loading
7. HTTP/browser caching
8. CDN/object storage
9. Additional caching infrastructure only when measurable traffic or performance requirements justify it

# 19. Implementation Target

The final schema should be implemented using:

``` text
Frontend:
Next.js

Backend:
Node.js / API layer

ORM:
Prisma

Database:
MySQL or MariaDB
```

The database architecture in this document is the source of truth.

When implementing Prisma:

-   Preserve all entity names and relationships.
-   Preserve nullable vs required fields.
-   Preserve enums.
-   Preserve unique constraints.
-   Preserve UUID primary keys.
-   Preserve timestamps.
-   Add appropriate indexes.
-   Use MySQL/MariaDB-compatible Prisma configuration.
-   Do not switch the database provider to PostgreSQL.

------------------------------------------------------------------------

# 20. Final Checklist for AI Agents

Before modifying the database, verify:

-   [ ] There are exactly 7 core entities.
-   [ ] No User/Customer entity exists.
-   [ ] No e-commerce entities exist.
-   [ ] Database provider is MySQL or MariaDB.
-   [ ] Prisma is the ORM.
-   [ ] All primary keys use UUID.
-   [ ] ProductCategory → Product is 1:N.
-   [ ] Product.category_id is required.
-   [ ] Product.branch_id is nullable.
-   [ ] Story.branch_id is nullable.
-   [ ] Event.branch_id is nullable.
-   [ ] PhotoUpload.branch_id is nullable.
-   [ ] PhotoUpload.reviewed_by_admin_id is nullable.
-   [ ] Product.description is nullable.
-   [ ] ProductStatus is an enum.
-   [ ] ContentStatus is an enum.
-   [ ] PhotoStatus is an enum.
-   [ ] Photo uploads start as PENDING.
-   [ ] Only approved photos are publicly displayed.
-   [ ] Public slugs are unique.
-   [ ] Money uses DECIMAL.
-   [ ] File size uses BIGINT.
-   [ ] Foreign keys reference the correct primary keys.
-   [ ] Appropriate indexes are present.
-   [ ] No unnecessary tables are introduced.

------------------------------------------------------------------------

- [ ] Binary images are not stored directly in MySQL/MariaDB.
- [ ] Image metadata and URLs are stored in the database instead.
- [ ] Public gallery queries use pagination.
- [ ] Public APIs return only required fields.
- [ ] Admin moderation metadata is not exposed publicly.
- [ ] Images use optimized variants and lazy loading where appropriate.
- [ ] Queries avoid SELECT *.
- [ ] Database indexes are based on actual query patterns.
- [ ] Large image uploads are validated and optimized.
- [ ] No unnecessary caching infrastructure is introduced prematurely.

# 21. Final Architecture Decision

**LOCKED**

This ERD is the approved database foundation for Raccoon Coffee.

Do not redesign the database architecture unless a new business
requirement makes the existing structure insufficient.

Any future change should be treated as an explicit schema evolution and
should preserve backward compatibility where practical.
