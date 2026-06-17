<!-- generated-by: gsd-doc-writer -->
# Getting Started

Welcome to Isian! This guide will help you set up the project locally for development.

## Prerequisites

Before starting, ensure you have the following installed on your system:
* **Node.js**: Version `22.x` or higher (LTS recommended)
* **npm**: Node Package Manager (comes bundled with Node.js)
* **PostgreSQL**: Version `16` or higher
* **Docker / Docker Compose** (Optional, for containerized database execution)

## Installation steps

1. Clone the repository:
   ```bash
   git clone https://github.com/example/jott.git
   ```
2. Navigate into the project directory:
   ```bash
   cd jott
   ```
3. Install dependencies using clean install:
   ```bash
   npm ci
   ```

## First run

1. Copy the environment template:
   ```bash
   cp .env.example .env
   ```
2. Configure your local PostgreSQL database credentials and NextAuth secrets inside `.env`.
3. Generate the Prisma client:
   ```bash
   npx prisma generate
   ```
4. Run the database migrations (optional, if setting up the database tables for the first time):
   ```bash
   npx prisma migrate dev
   ```
5. Start the development server:
   ```bash
   npm run dev
   ```
6. Open your browser and navigate to `http://localhost:3456`.

## Common setup issues

### 1. Database Connection Failures
* **Issue**: The application fails to start or query data, showing Prisma client initialization errors.
* **Solution**: Ensure your PostgreSQL service is running and that `DATABASE_URL` in `.env` contains the correct host, port, user, and password. If using Docker Compose, make sure the database port does not collide with a local running PostgreSQL instance (the example configuration maps host port `5443` to container port `5432`).

### 2. Prisma Client Import Error
* **Issue**: TypeScript compilation or bundler fails on importing database dependencies.
* **Solution**: Run `npx prisma generate` to build the TypeScript client bindings. This must be rerun whenever you pull database schema changes or alter `schema.prisma`.

## Next steps

Now that you have the application running locally, check out the following documents:
* For building, linting, and contributing guidelines, read the [Development Guide](file:///c:/Users/yudhiar/Downloads/oprek/Dev/jott/docs/DEVELOPMENT.md).
* For instructions on how to write and run tests, refer to the [Testing Guide](file:///c:/Users/yudhiar/Downloads/oprek/Dev/jott/docs/TESTING.md).
