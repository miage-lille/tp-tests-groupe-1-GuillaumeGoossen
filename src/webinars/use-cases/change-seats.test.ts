import { InMemoryWebinarRepository } from 'src/webinars/adapters/webinar-repository.in-memory';
import { Webinar } from 'src/webinars/entities/webinar.entity';
import { ChangeSeats } from 'src/webinars/use-cases/change-seats';
import { testUser } from 'src/users/tests/user-seeds';
import { WebinarNotFoundException } from 'src/webinars/exceptions/webinar-not-found';
import { WebinarNotOrganizerException } from 'src/webinars/exceptions/webinar-not-organizer';
import { WebinarReduceSeatsException } from 'src/webinars/exceptions/webinar-reduce-seats';
import { WebinarTooManySeatsException } from 'src/webinars/exceptions/webinar-too-many-seats';

describe('Feature : Change seats', () => {
  let webinarRepository: InMemoryWebinarRepository;
  let useCase: ChangeSeats;

  const webinar = new Webinar({
    id: 'webinar-id',
    organizerId: testUser.alice.props.id,
    title: 'Webinar title',
    startDate: new Date('2024-01-01T00:00:00Z'),
    endDate: new Date('2024-01-01T01:00:00Z'),
    seats: 100,
  });

  beforeEach(() => {
    webinarRepository = new InMemoryWebinarRepository([webinar]);
    useCase = new ChangeSeats(webinarRepository);
  });

  describe('Scenario: Happy path', () => {
    const payload = {
      user: testUser.alice,
      webinarId: 'webinar-id',
      seats: 200,
    };

    it('should change the number of seats for a webinar', async () => {
      // ACT
      await useCase.execute(payload);

      // ASSERT
      const updatedWebinar = await webinarRepository.findById('webinar-id');
      expect(updatedWebinar?.props.seats).toEqual(200);
    });
  });

  describe('Scenario: webinar does not exist', () => {
    const payload = {
      user: testUser.alice,
      webinarId: 'non-existing-id',
      seats: 150,
    };

    it('should fail', async () => {
      // ACT & ASSERT
      await expect(useCase.execute(payload)).rejects.toThrow(
        WebinarNotFoundException,
      );
    });

    it('should not modify any webinar', async () => {
      // ACT
      try {
        await useCase.execute(payload);
      } catch (error) {
        // Expected error
      }

      // ASSERT
      const webinar = webinarRepository.findByIdSync('webinar-id');
      expect(webinar?.props.seats).toEqual(100);
    });
  });

  describe('Scenario: update the webinar of someone else', () => {
    const payload = {
      user: testUser.bob,
      webinarId: 'webinar-id',
      seats: 150,
    };

    it('should fail', async () => {
      // ACT & ASSERT
      await expect(useCase.execute(payload)).rejects.toThrow(
        WebinarNotOrganizerException,
      );
    });

    it('should not modify the webinar', async () => {
      // ACT
      try {
        await useCase.execute(payload);
      } catch (error) {
        // Expected error
      }

      // ASSERT
      const webinar = webinarRepository.findByIdSync('webinar-id');
      expect(webinar?.props.seats).toEqual(100);
    });
  });

  describe('Scenario: change seat to an inferior number', () => {
    const payload = {
      user: testUser.alice,
      webinarId: 'webinar-id',
      seats: 50,
    };

    it('should fail', async () => {
      // ACT & ASSERT
      await expect(useCase.execute(payload)).rejects.toThrow(
        WebinarReduceSeatsException,
      );
    });

    it('should not modify the webinar', async () => {
      // ACT
      try {
        await useCase.execute(payload);
      } catch (error) {
        // Expected error
      }

      // ASSERT
      const webinar = webinarRepository.findByIdSync('webinar-id');
      expect(webinar?.props.seats).toEqual(100);
    });
  });

  describe('Scenario: change seat to a number > 1000', () => {
    const payload = {
      user: testUser.alice,
      webinarId: 'webinar-id',
      seats: 1500,
    };

    it('should fail', async () => {
      // ACT & ASSERT
      await expect(useCase.execute(payload)).rejects.toThrow(
        WebinarTooManySeatsException,
      );
    });

    it('should not modify the webinar', async () => {
      // ACT
      try {
        await useCase.execute(payload);
      } catch (error) {
        // Expected error
      }

      // ASSERT
      const webinar = webinarRepository.findByIdSync('webinar-id');
      expect(webinar?.props.seats).toEqual(100);
    });
  });
});