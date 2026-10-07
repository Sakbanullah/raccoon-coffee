# Raccoon Development Guidelines

## 1. Purpose

This document defines the development rules for the Raccoon Coffee project.

Its purpose is to keep the codebase:
- simple
- consistent
- maintainable
- safe for both AI coding agents and developers
- efficient in dependencies and resource usage
- aligned with the database and frontend architecture

These guidelines apply to the entire Raccoon project, including frontend and backend development.

---

## 2. Source of Truth

Before making changes, an AI coding agent MUST read the relevant documentation.

Primary source-of-truth documents:

```text
docs/
├── raccoon-database-architecture.md
├── raccoon-frontend-architecture.md
└── raccoon-development-guidelines.md
```

Rules:

- `raccoon-database-architecture.md` is the source of truth for the database and Prisma.
- `raccoon-frontend-architecture.md` is the source of truth for frontend structure, UX, visual direction, and frontend behavior.
- `raccoon-development-guidelines.md` is the source of truth for implementation and development workflow.
- Do not make architectural decisions that conflict with these documents without a clear reason.
- If documents conflict, stop risky changes and report the conflict before proceeding.

---

## 3. Project Structure

The main project structure is:

```text
raccoon/
├── backend/
├── frontend/
├── docs/
├── temporary/
├── .gitignore
└── README.md
```

### Backend

Backend uses NestJS + Prisma + MariaDB/MySQL.

```text
backend/
├── prisma/
│   ├── schema.prisma
│   └── migrations/
└── src/
```

### Frontend

Frontend uses Next.js + TypeScript + Tailwind CSS.

```text
frontend/
├── app/
├── components/
├── lib/
├── types/
└── public/
```

The structure may evolve when real requirements appear, but folders should not be created simply to follow an architectural pattern that is not needed.

---

## 4. Database Rules

The database is a sensitive part of the project.

### Required

- Database uses MariaDB/MySQL.
- ORM uses Prisma.
- Primary keys use UUIDs.
- Prisma fields use camelCase.
- Database columns use snake_case through `@map`.
- Use migrations for schema changes.
- Every schema change must have a clear reason.
- Consider foreign keys and indexes based on actual query patterns.

### Prohibited Without Explicit Instruction

Do not run:

```text
prisma migrate reset
prisma db push
prisma db pull
DROP DATABASE
DROP TABLE
TRUNCATE
```

Do not delete applied migrations.

Do not change the database schema simply because it looks cleaner if the change is not required by a real feature.

### Migration Workflow

Normal workflow:

```text
update schema.prisma
        ↓
prisma format
        ↓
prisma validate
        ↓
prisma migrate dev
        ↓
verify migration
        ↓
build/test
```

Applied migrations are part of the project's history and must not be edited casually.

---

## 5. Existing Database Baseline

The current database has 7 core entities:

```text
Admin
Branch
ProductCategory
Product
Story
Event
PhotoUpload
```

Do not add new entities simply because they are common in other applications.

Examples of entities that are NOT currently required:

```text
Customer
User
Order
Cart
Payment
Review
Comment
Wishlist
```

If a new feature genuinely requires a new entity, explain the requirement and impact before implementing it.

---

## 6. Backend Rules

The backend is responsible for:

- business logic
- validation
- database access
- authentication and admin authorization
- upload handling
- moderation
- API responses

The frontend must never access Prisma directly.

The boundary must remain:

```text
Frontend
   ↓ HTTP API
NestJS Backend
   ↓
Prisma
   ↓
MariaDB
```

### Controllers

Controllers handle the HTTP layer.

Do not place complex business logic inside controllers.

### Services

Business logic belongs in services.

Services may handle:
- business-rule validation
- database queries
- data transformation
- workflow logic

### Prisma

Use PrismaService for database access.

Avoid fetching more data than necessary.

Do not conceptually use:

```text
SELECT *
```

when only a few fields are required.

Use `select` or `include` deliberately.

---

## 7. API Rules

APIs must be:

- consistent
- predictable
- explicit about HTTP status codes
- based on clear response shapes
- validated
- safe from internal-data leakage

Do not create a new endpoint if an existing endpoint can clearly handle the requirement.

For list endpoints:
- use pagination when data can grow
- do not return an unlimited dataset
- consider cursor pagination for galleries or continuously growing data

For public APIs:
- return only fields required by the frontend
- never expose PhotoUpload moderation metadata publicly
- never expose credentials or internal information

---

## 8. Photo Upload Rules

Raccoon Wall allows visitors to upload photos without creating an account.

Therefore, uploads must always be treated as untrusted input.

Workflow:

```text
Visitor
   ↓
Upload Photo
   ↓
Validation
   ↓
PENDING
   ↓
Admin Review
   ├── APPROVED → Public Wall
   ├── REJECTED
   └── HIDDEN
```

The database stores metadata and URLs only.

Do not store image binaries directly in the database.

Uploads should consider:
- MIME type
- file size
- extension
- image dimensions
- filename sanitization
- rate limiting
- abuse prevention
- moderation

Do not make uploads publicly visible before moderation when approval is required.

---

## 9. Frontend Rules

Frontend development follows:

```text
docs/raccoon-frontend-architecture.md
```

Core principles:

- photography-first
- editorial layout
- premium modern
- warm/cozy
- contemporary
- responsive
- lightweight

Do not make the UI look like:
- a generic SaaS dashboard
- an admin template
- a generic AI landing page
- an overly rounded component collection
- a page dominated by gradients
- a page dominated by glassmorphism

Create component abstractions when components are genuinely reused.

Do not create abstractions prematurely.

---

## 10. Styling Rules

Follow the established visual direction:

- deep navy
- warm off-white / cream
- muted green
- coffee brown
- restrained warm/gold accent

Do not introduce unrelated color palettes arbitrarily.

Typography should have a clear hierarchy.

Avoid using too many font families.

Spacing must remain consistent and responsive.

---

## 11. Animation Rules

Animation should improve the experience, not become the main attraction.

Priority:

1. subtle entrance
2. hover interaction
3. scroll reveal
4. image transition
5. section transition

Avoid:
- excessive animation
- continuous animation without purpose
- heavy particle effects
- expensive WebGL
- large animation libraries for a single simple effect

Use CSS or native browser capabilities when they are sufficient.

If an animation library is required, make sure its benefit justifies the additional dependency and bundle cost.

---

## 12. Image Rules

Images are an important part of Raccoon's identity.

### Development

- use placeholders or local temporary assets
- do not use random copyrighted images for production
- do not store image binaries in the database

### Production

- use WebP/AVIF where appropriate
- use responsive image sizes
- use thumbnails for galleries
- lazy-load images outside the initial viewport
- avoid loading large original images for cards or galleries

Raccoon Wall should use thumbnail/display variants as the number of photos grows.

---

## 13. Performance Rules

Performance should be considered from the beginning, but avoid premature optimization.

Priorities:

- minimize unnecessary JavaScript
- avoid unnecessary dependencies
- use server rendering where appropriate with Next.js
- lazy-load non-critical resources
- optimize images
- paginate growing datasets
- avoid unbounded database queries
- avoid unnecessary repeated API requests

Do not add:

```text
Redis
message brokers
microservices
complex caching layers
CDN infrastructure
```

only for "future-proofing".

Add infrastructure when there is a real requirement.

---

## 14. Dependency Rules

Before adding a dependency, ask:

1. Is it actually necessary?
2. Can native browser/runtime capabilities solve the problem?
3. Can an existing dependency solve it?
4. Is the dependency actively maintained and appropriate for the stack?
5. Is its complexity and size justified?

Do not add a library simply because it is popular.

---

## 15. Validation and Error Handling

All user input must be treated as untrusted.

The backend must perform validation.

Frontend validation improves UX but does not replace backend validation.

Errors should:
- be clear
- be safe
- never expose stack traces in production
- never expose credentials
- never expose database queries

Development errors may contain more detail than production errors.

---

## 16. Environment Variables

Credentials and secrets must never be hardcoded.

Use `.env` files.

Do not commit:

```text
.env
.env.local
.env.production
```

When a new environment variable is required:
- document it
- use a clear name
- never store the secret in source code

---

## 17. Temporary Files

All temporary files must be placed inside:

```text
temporary/
```

Examples:

```text
temporary/
├── debug-script.js
├── migration-inspect.js
├── test-upload.js
└── notes.md
```

Do not scatter experimental files throughout:

```text
backend/
frontend/
root/
```

unless they are permanent parts of the project.

Temporary files may be removed once they are no longer needed.

---

## 18. Testing and Verification

Every change must be verified according to its scope.

### Frontend changes

At minimum:

```text
lint
build
```

### Backend changes

At minimum:

```text
prisma validate
build
```

### Database changes

At minimum:

```text
prisma format
prisma validate
migration verification
build/test
```

Run relevant tests when available.

Never declare a task complete simply because the code looks correct.

---

## 19. AI Coding Agent Rules

AI coding agents MUST:

1. Read relevant documentation before coding.
2. Understand the existing project structure before creating files.
3. Avoid modifying unrelated areas.
4. Never remove existing code without a clear reason.
5. Never add dependencies without a real need.
6. Never perform destructive database operations without explicit authorization.
7. Never create temporary files outside `temporary/`.
8. Verify the result after implementation.
9. Fix errors caused by their own changes.
10. Report which files were changed.
11. Report which verification commands were executed.
12. Explicitly report unresolved issues.

### Scope Discipline

If the task is:

```text
"Build the homepage"
```

do not also:
- change the database
- build authentication
- build an admin panel
- build the upload system
- build deployment infrastructure

Stay within the requested scope.

---

## 20. Avoid Over-Engineering

Raccoon is a coffee shop website, not a distributed banking platform.

Choose the simplest solution that is:

- correct
- secure
- maintainable
- sufficient for the current requirements

Do not introduce:

```text
microservices
event-driven architecture
complex state management
unnecessary abstraction layers
unnecessary design patterns
```

unless there is a real requirement.

---

## 21. Feature Development Workflow

Use the following workflow:

```text
Understand
    ↓
Check source of truth
    ↓
Define scope
    ↓
Implement the smallest correct solution
    ↓
Verify
    ↓
Review changes
    ↓
Report
```

Before coding, the agent should know:

- what feature is being built
- which files are likely to change
- whether a dependency is needed
- whether the database changes
- whether the API changes
- how the feature will be verified

---

## 22. Git Rules

Commits should describe actual changes.

Good examples:

```text
feat: add homepage structure
feat: add photo upload moderation
fix: handle invalid photo upload
refactor: simplify product service
chore: update frontend dependencies
docs: update API architecture
```

Avoid commits such as:

```text
update
fix
changes
test
aaa
final
final-final
```

Never commit secrets.

Do not commit temporary artifacts unless they are intentionally required.

---

## 23. Definition of Done

A task is considered complete when:

- the feature meets the requirement
- the implementation follows the source of truth
- unrelated areas were not changed
- the project builds successfully
- lint/typecheck passes according to the scope
- migrations are valid if the database changed
- there are no obvious runtime errors
- temporary artifacts are stored correctly
- the changes can be clearly explained

If an issue remains unresolved, report the task as incomplete rather than claiming completion.

---

## 24. Current Project Priorities

The current Raccoon development order is:

```text
1. Database foundation
2. Frontend foundation
3. Homepage structure
4. Visual identity + design system
5. Backend API integration
6. Raccoon Wall upload + moderation
7. Admin functionality
8. Production optimization
9. Deployment
```

Do not skip priorities without a clear reason.

---

## 25. Final Principle

Build Raccoon as a focused product.

Prioritize:

```text
Clarity
Consistency
Performance
Maintainability
User experience
```

Not feature count.

If a solution is more complex than the problem it solves, choose the simpler solution.
