import { defineConfig, env } from '@prisma/client';

export default defineConfig({
  // Specify schema location
  schema: './schema.prisma',
  datasource: {
    db: {
      provider: 'sqlserver',
      url: env('DATABASE_URL'),
    },
  },
  generator: {
    client: {
      provider: 'prisma-client-js',
    },
  },
});
