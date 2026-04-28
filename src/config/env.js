const fs = require('fs');
const path = require('path');
const { z } = require('zod');

function loadEnvFile(fileName) {
  const filePath = path.join(process.cwd(), fileName);
  if (!fs.existsSync(filePath)) return;

  const contents = fs.readFileSync(filePath, 'utf8');

  for (const rawLine of contents.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;

    const separatorIndex = line.indexOf('=');
    if (separatorIndex === -1) continue;

    const key = line.slice(0, separatorIndex).trim();
    let value = line.slice(separatorIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

loadEnvFile('.env');
loadEnvFile('.env.example');

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3000),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_ACCESS_EXPIRES_IN: z.string().default('1h'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  RATE_LIMIT_AUTH: z.coerce.number().default(5),
  DEAD_STOCK_THRESHOLD_DAYS: z.coerce.number().default(30),
  DEAD_STOCK_MARKDOWN_PERCENT: z.coerce.number().default(10),
  DEAD_STOCK_INTERVAL_HOURS: z.coerce.number().default(72),
  DEAD_STOCK_PRICE_FLOOR_PERCENT: z.coerce.number().default(40),
  RESERVATION_TTL_HOURS: z.coerce.number().default(24),
  CORS_ORIGIN: z.string().default('http://localhost:3000'),
  DEFAULT_TENANT_ID: z.string().default('00000000-0000-0000-0000-000000000001'),
});

function validateEnv() {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    console.error('❌ Invalid environment variables:');
    for (const issue of result.error.issues) {
      console.error(`  - ${issue.path.join('.')}: ${issue.message}`);
    }
    process.exit(1);
  }

  return result.data;
}

const env = validateEnv();

module.exports = { env };
