import { PrismaClient } from '@prisma/client';
import {
  PostgreSqlContainer,
  StartedPostgreSqlContainer,
} from '@testcontainers/postgresql';
import { exec } from 'child_process';
import { PrismaWebinarRepository } from 'src/webinars/adapters/webinar-repository.prisma';
import { Webinar } from 'src/webinars/entities/webinar.entity';
import { promisify } from 'util';

const asyncExec = promisify(exec);

describe('PrismaWebinarRepository', () => {
  let container: StartedPostgreSqlContainer;
  let prismaClient: PrismaClient;
  let repository: PrismaWebinarRepository;

  beforeAll(async () => {
    // Démarrer le container PostgreSQL
    container = await new PostgreSqlContainer()
      .withDatabase('test_db')
      .withUsername('user_test')
      .withPassword('password_test')
      .withExposedPorts(5432)
      .start();

    const dbUrl = container.getConnectionUri();
    prismaClient = new PrismaClient({
      datasources: {
        db: { url: dbUrl },
      },
    });

    // Exécuter les migrations avec PowerShell sur Windows
    const command = process.platform === 'win32'
      ? `$env:DATABASE_URL='${dbUrl}'; npx prisma migrate deploy`
      : `DATABASE_URL=${dbUrl} npx prisma migrate deploy`;

    await asyncExec(command, { shell: process.platform === 'win32' ? 'powershell.exe' : '/bin/bash' });

    return prismaClient.$connect();
  }, 60000);

  beforeEach(async () => {
    repository = new PrismaWebinarRepository(prismaClient);
    await prismaClient.webinar.deleteMany();
  });

  afterAll(async () => {
    if (container) {
      await container.stop({ timeout: 1000 });
    }
    if (prismaClient) {
      return prismaClient.$disconnect();
    }
  });

  describe('Scenario : repository.create', () => {
    it('should create a webinar', async () => {
      // ARRANGE
      const webinar = new Webinar({
        id: 'webinar-id',
        organizerId: 'organizer-id',
        title: 'Webinar title',
        startDate: new Date('2022-01-01T00:00:00Z'),
        endDate: new Date('2022-01-01T01:00:00Z'),
        seats: 100,
      });

      // ACT
      await repository.create(webinar);

      // ASSERT
      const maybeWebinar = await prismaClient.webinar.findUnique({
        where: { id: 'webinar-id' },
      });
      expect(maybeWebinar).toEqual({
        id: 'webinar-id',
        organizerId: 'organizer-id',
        title: 'Webinar title',
        startDate: new Date('2022-01-01T00:00:00Z'),
        endDate: new Date('2022-01-01T01:00:00Z'),
        seats: 100,
      });
    });
  });

  describe('Scenario : repository.findById', () => {
    it('should find a webinar by id', async () => {
      // ARRANGE
      const webinar = new Webinar({
        id: 'webinar-id',
        organizerId: 'organizer-id',
        title: 'Webinar title',
        startDate: new Date('2022-01-01T00:00:00Z'),
        endDate: new Date('2022-01-01T01:00:00Z'),
        seats: 100,
      });
      await repository.create(webinar);

      // ACT
      const foundWebinar = await repository.findById('webinar-id');

      // ASSERT
      expect(foundWebinar?.props.id).toEqual('webinar-id');
      expect(foundWebinar?.props.title).toEqual('Webinar title');
      expect(foundWebinar?.props.seats).toEqual(100);
    });

    it('should return null if webinar does not exist', async () => {
      // ACT
      const foundWebinar = await repository.findById('non-existing-id');

      // ASSERT
      expect(foundWebinar).toBeNull();
    });
  });

  describe('Scenario : repository.update', () => {
    it('should update a webinar', async () => {
      // ARRANGE
      const webinar = new Webinar({
        id: 'webinar-id',
        organizerId: 'organizer-id',
        title: 'Webinar title',
        startDate: new Date('2022-01-01T00:00:00Z'),
        endDate: new Date('2022-01-01T01:00:00Z'),
        seats: 100,
      });
      await repository.create(webinar);

      // ACT
      webinar.update({ seats: 200 });
      await repository.update(webinar);

      // ASSERT
      const updatedWebinar = await prismaClient.webinar.findUnique({
        where: { id: 'webinar-id' },
      });
      expect(updatedWebinar?.seats).toEqual(200);
    });
  });
});