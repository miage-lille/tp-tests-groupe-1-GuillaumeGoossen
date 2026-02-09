import { PrismaClient } from '@prisma/client';
import {
  PostgreSqlContainer,
  StartedPostgreSqlContainer,
} from '@testcontainers/postgresql';
import { exec } from 'child_process';
import Fastify, { FastifyInstance } from 'fastify';
import { AppContainer } from 'src/container';
import { webinarRoutes } from 'src/webinars/routes';
import { promisify } from 'util';

const asyncExec = promisify(exec);

export class TestServerFixture {
  private container!: StartedPostgreSqlContainer;
  private prismaClient!: PrismaClient;
  private serverInstance!: FastifyInstance;
  private appContainer!: AppContainer;

  async init() {
    // Démarrer le container PostgreSQL
    this.container = await new PostgreSqlContainer()
      .withDatabase('test_db')
      .withUsername('user_test')
      .withPassword('password_test')
      .start();

    const dbUrl = this.container.getConnectionUri();

    // Initialiser Prisma et les dépendances
    this.prismaClient = new PrismaClient({
      datasources: {
        db: { url: dbUrl },
      },
    });

    // Exécuter les migrations avec PowerShell sur Windows
    const command = process.platform === 'win32'
      ? `$env:DATABASE_URL='${dbUrl}'; npx prisma migrate deploy`
      : `DATABASE_URL=${dbUrl} npx prisma migrate deploy`;

    await asyncExec(command, { shell: process.platform === 'win32' ? 'powershell.exe' : '/bin/bash' });

    await this.prismaClient.$connect();

    // Initialiser le conteneur avec Prisma
    this.appContainer = new AppContainer();
    this.appContainer.init(this.prismaClient);

    // Initialiser le serveur
    this.serverInstance = Fastify({ logger: false });
    await webinarRoutes(this.serverInstance, this.appContainer);
    await this.serverInstance.ready();
  }

  getPrismaClient() {
    return this.prismaClient;
  }

  getServer() {
    return this.serverInstance.server;
  }

  async stop() {
    if (this.serverInstance) await this.serverInstance.close();
    if (this.prismaClient) await this.prismaClient.$disconnect();
    if (this.container) await this.container.stop();
  }

  async reset() {
    await this.prismaClient.webinar.deleteMany();
  }
}
