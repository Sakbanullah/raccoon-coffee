#!/usr/bin/env node
'use strict';

// Production admin bootstrap.
//
// Run from backend/ after `npx prisma migrate deploy`, with the production
// environment loaded (DATABASE_URL). The command is interactive on purpose:
// the password is entered at a hidden prompt and is never accepted from argv
// or the environment.
//
// This script only creates the first admin. It never updates an existing admin
// and never prints the connection string, password, or password hash.

const { URL } = require('url');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const BCRYPT_COST = 10;
const MIN_PASSWORD_LENGTH = 12;
const BCRYPT_MAX_BYTES = 72;

class SafeError extends Error {}

function requireInteractiveTerminal() {
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    throw new SafeError(
      'This command requires an interactive terminal (TTY). ' +
        'Run it directly in a terminal; pipes, CI jobs, and non-interactive shells are refused.',
    );
  }
  if (typeof process.stdin.setRawMode !== 'function') {
    throw new SafeError('This terminal does not support hidden password input.');
  }
}

function readDatabaseTarget(raw) {
  const value = raw?.trim();
  if (!value) {
    throw new SafeError(
      'DATABASE_URL is not set. Load the production environment before running this command.',
    );
  }
  if (value.includes('<') || value.includes('>')) {
    throw new SafeError(
      'DATABASE_URL still contains a placeholder. Set the real production connection string first.',
    );
  }

  let url;
  try {
    url = new URL(value);
  } catch {
    throw new SafeError('DATABASE_URL is not a valid URL.');
  }

  const protocol = url.protocol.toLowerCase();
  if (protocol !== 'mysql:' && protocol !== 'mariadb:') {
    throw new SafeError('DATABASE_URL must use the mysql:// or mariadb:// scheme.');
  }
  if (!url.hostname) {
    throw new SafeError('DATABASE_URL is missing a database host.');
  }

  const port = url.port || '3306';
  const portNumber = Number(port);
  if (!Number.isInteger(portNumber) || portNumber < 1 || portNumber > 65535) {
    throw new SafeError('DATABASE_URL has an invalid database port.');
  }

  let database;
  try {
    database = decodeURIComponent(url.pathname.replace(/^\/+/, ''));
  } catch {
    throw new SafeError('DATABASE_URL has an invalid database name.');
  }
  if (!database || database.includes('/')) {
    throw new SafeError('DATABASE_URL is missing a database name.');
  }

  // Only these three non-secret fields are ever displayed.
  return { host: url.hostname, port, database };
}

// Single-line reader on raw stdin. Hidden mode prints nothing while typing.
function ask(prompt, hidden) {
  return new Promise((resolve, reject) => {
    const stdin = process.stdin;
    let value = '';

    process.stdout.write(prompt);
    stdin.setRawMode(true);
    stdin.setEncoding('utf8');
    stdin.resume();

    const cleanup = () => {
      stdin.removeListener('data', onData);
      stdin.setRawMode(false);
      stdin.pause();
    };

    const finish = (err) => {
      cleanup();
      process.stdout.write('\n');
      if (err) reject(err);
      else resolve(value);
    };

    const onData = (chunk) => {
      for (const char of chunk) {
        if (char === '\r' || char === '\n') return finish();
        if (char === '\u0003') return finish(new SafeError('Cancelled.'));
        if (char === '\u0008' || char === '\u007f') {
          if (value.length > 0) {
            value = value.slice(0, -1);
            if (!hidden) process.stdout.write('\b \b');
          }
          continue;
        }
        if (char >= ' ') {
          value += char;
          if (!hidden) process.stdout.write(char);
        }
      }
    };

    stdin.on('data', onData);
  });
}

function validateName(name) {
  const trimmed = name.trim();
  if (!trimmed) throw new SafeError('Admin name is required.');
  if (trimmed.length > 255) throw new SafeError('Admin name must be 255 characters or fewer.');
  return trimmed;
}

function validateEmail(email) {
  const trimmed = email.trim().toLowerCase();
  if (!trimmed || trimmed.length > 255 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
    throw new SafeError('Enter a valid email address.');
  }
  return trimmed;
}

function validatePassword(password, confirmation) {
  if (password !== confirmation) throw new SafeError('Passwords do not match.');
  if (password.length < MIN_PASSWORD_LENGTH) {
    throw new SafeError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
  }
  if (bcrypt.truncates(password)) {
    throw new SafeError(
      `Password is too long for bcrypt (more than ${BCRYPT_MAX_BYTES} bytes). Choose a shorter password.`,
    );
  }
  return password;
}

async function bootstrap(prisma, target) {
  let existingAdmins;
  try {
    existingAdmins = await prisma.admin.count();
  } catch (err) {
    if (err && err.code === 'P2021') {
      throw new SafeError(
        'The Admin table does not exist. Run `npx prisma migrate deploy` first, then re-run `npm run admin:bootstrap`.',
      );
    }
    throw new SafeError(
      'Could not read the Admin table. Check that the database is reachable and that DATABASE_URL points to the migrated production database.',
    );
  }

  if (existingAdmins > 0) {
    console.log('An admin already exists. No changes made.');
    return;
  }

  const name = validateName(await ask('Admin name: ', false));
  const email = validateEmail(await ask('Admin email: ', false));
  const password = validatePassword(
    await ask(`Password (min ${MIN_PASSWORD_LENGTH} characters, hidden): `, true),
    await ask('Confirm password (hidden): ', true),
  );

  console.log('');
  console.log('Database target (credentials hidden):');
  console.log(`  host:     ${target.host}`);
  console.log(`  port:     ${target.port}`);
  console.log(`  database: ${target.database}`);
  console.log('');

  const confirmation = (await ask('Type CREATE to create the first admin: ', false)).trim();
  if (confirmation !== 'CREATE') {
    console.log('Aborted. No changes made.');
    process.exitCode = 1;
    return;
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_COST);
  try {
    await prisma.admin.create({ data: { name, email, passwordHash } });
  } catch (err) {
    if (err && err.code === 'P2002') {
      throw new SafeError('An admin with that email already exists. No changes made.');
    }
    throw new SafeError('Could not create the admin. No changes were made.');
  }

  console.log(`Created admin ${email}.`);
}

async function main() {
  if (process.argv.length > 2) {
    throw new SafeError(
      'This command takes no arguments. Enter the name, email, and password at the interactive prompts.',
    );
  }

  requireInteractiveTerminal();
  const target = readDatabaseTarget(process.env.DATABASE_URL);

  const prisma = new PrismaClient();
  try {
    await bootstrap(prisma, target);
  } finally {
    await prisma.$disconnect().catch(() => {
      console.error('Warning: Prisma could not disconnect cleanly.');
    });
  }
}

main().catch((err) => {
  if (err instanceof SafeError) {
    console.error(`\nError: ${err.message}`);
  } else {
    const code = err && typeof err.code === 'string' ? ` (code ${err.code})` : '';
    console.error(`\nError: bootstrap failed${code}. No credentials were printed.`);
  }
  process.exitCode = 1;
});
