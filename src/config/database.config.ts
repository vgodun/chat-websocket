import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';


export const databaseConfig = (configService: ConfigService): TypeOrmModuleOptions => {
  const config = {
    type: 'postgres' as const,
    host: configService.get<string>('DB_HOST', 'localhost'),
    port: configService.get<number>('DB_PORT', 5432),
    username: configService.get<string>('DB_USERNAME', 'postgres'),
    password: configService.get<string>('DB_PASSWORD', 'password'),
    database: configService.get<string>('DB_NAME', 'chat_app'),
    entities: [__dirname + '/../**/*.entity{.ts,.js}'],
    migrations: [__dirname + '/../migrations/*{.ts,.js}'],
    synchronize: configService.get<string>('NODE_ENV') !== 'production',
    logging: configService.get<string>('NODE_ENV') === 'development',
    ssl: false,
    extra: {
      connectionTimeoutMillis: 5000,
      query_timeout: 5000,
      statement_timeout: 5000,
      ssl: false,
      sslmode: 'disable',
    },
    uuidExtension: 'pgcrypto' as const,
    maxQueryExecutionTime: 1000,
  };

  return config;
}; 