import supertest from 'supertest';
import { TestServerFixture } from 'src/tests/fixtures';

describe('Webinar Routes E2E', () => {
  let fixture: TestServerFixture;

  beforeAll(async () => {
    fixture = new TestServerFixture();
    await fixture.init();
  }, 60000);

  beforeEach(async () => {
    await fixture.reset();
  });

  afterAll(async () => {
    await fixture.stop();
  });

  describe('POST /webinars/:id/seats', () => {
    it('should update webinar seats', async () => {
      // ARRANGE
      const prisma = fixture.getPrismaClient();
      const server = fixture.getServer();

      const webinar = await prisma.webinar.create({
        data: {
          id: 'test-webinar',
          title: 'Webinar Test',
          seats: 10,
          startDate: new Date(),
          endDate: new Date(),
          organizerId: 'test-user',
        },
      });

      // ACT
      const response = await supertest(server)
        .post(`/webinars/${webinar.id}/seats`)
        .send({ seats: '30' })
        .expect(200);

      // ASSERT
      expect(response.body).toEqual({ message: 'Seats updated' });

      const updatedWebinar = await prisma.webinar.findUnique({
        where: { id: webinar.id },
      });
      expect(updatedWebinar?.seats).toBe(30);
    });

    it('should return 404 when webinar does not exist', async () => {
      // ARRANGE
      const server = fixture.getServer();

      // ACT & ASSERT
      const response = await supertest(server)
        .post('/webinars/non-existing-id/seats')
        .send({ seats: '30' })
        .expect(404);

      expect(response.body).toHaveProperty('error');
    });

    it('should return 401 when user is not the organizer', async () => {
      // ARRANGE
      const prisma = fixture.getPrismaClient();
      const server = fixture.getServer();

      await prisma.webinar.create({
        data: {
          id: 'test-webinar',
          title: 'Webinar Test',
          seats: 10,
          startDate: new Date(),
          endDate: new Date(),
          organizerId: 'different-user',
        },
      });

      // ACT & ASSERT
      const response = await supertest(server)
        .post('/webinars/test-webinar/seats')
        .send({ seats: '30' })
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /webinars', () => {
    it('should create a new webinar', async () => {
      // ARRANGE
      const prisma = fixture.getPrismaClient();
      const server = fixture.getServer();

      // ACT
      const response = await supertest(server)
        .post('/webinars')
        .send({
          title: 'My Webinar',
          seats: 100,
          startDate: '2026-06-01T10:00:00Z',
          endDate: '2026-06-01T12:00:00Z',
        })
        .expect(201);

      // ASSERT
      expect(response.body).toHaveProperty('id');

      const createdWebinar = await prisma.webinar.findUnique({
        where: { id: response.body.id },
      });
      expect(createdWebinar).toBeDefined();
      expect(createdWebinar?.title).toBe('My Webinar');
      expect(createdWebinar?.seats).toBe(100);
    });

    it('should return 400 when webinar is too soon', async () => {
      // ARRANGE
      const server = fixture.getServer();

      // ACT & ASSERT
      const response = await supertest(server)
        .post('/webinars')
        .send({
          title: 'Too Soon Webinar',
          seats: 50,
          startDate: '2026-02-10T10:00:00Z',
          endDate: '2026-02-10T12:00:00Z',
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('should return 400 when seats are too many', async () => {
      // ARRANGE
      const server = fixture.getServer();

      // ACT & ASSERT
      const response = await supertest(server)
        .post('/webinars')
        .send({
          title: 'Too Many Seats',
          seats: 2000,
          startDate: '2026-06-01T10:00:00Z',
          endDate: '2026-06-01T12:00:00Z',
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });
  });
});
