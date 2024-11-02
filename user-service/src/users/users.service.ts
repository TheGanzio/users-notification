import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Queue } from 'bull';
import { InjectQueue } from '@nestjs/bull';

import { User } from './users.entity';
import { CreateUserDto } from './dto/create-user.dto';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { DELAY_REGULAR, DELAY_TEST } from '../common/consts';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @InjectRepository(User) private userRepository: Repository<User>,
    @InjectQueue('notifications') private notificationQueue: Queue,
  ) {}

  async createUser(createUserDto: CreateUserDto): Promise<User> {
    const { username } = createUserDto;

    if (!username) {
      throw new BadRequestException('Username is required.');
    }

    const user = this.userRepository.create({
      username,
    });

    try {
      const existUser = await this.userRepository.findOne({
        where: { username },
      });

      if (existUser) {
        this.logger.warn(`User ${username} already exists.`);
        throw new BadRequestException('User already exists.');
      }

      await this.userRepository.save(user);
      this.logger.log(`User ${user.username} created successfully.`);

      await this.notificationQueue.add(
        'sendNotification',
        { userId: user.id },
        { delay: DELAY_REGULAR },
      );
      this.logger.log(`Notification queued for user ${user.username}.`);

      return user;
    } catch (error) {
      this.logger.error(
        `Failed to create user ${username}: ${error.message}`,
        error.stack,
      );

      if (error instanceof BadRequestException) {
        throw error;
      }

      throw new InternalServerErrorException(
        'User creation failed due to an unexpected error.',
      );
    }
  }
}
