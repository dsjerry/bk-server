import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { CreateUserDto, UserUpdateDto } from 'src/dto/user.dto';
import { User } from 'src/entity/user.entity';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) { }

  getUsers(): Promise<User[]> {
    return this.userRepository.find();
  }

  createUser(createUserDto: CreateUserDto): Promise<User> {
    const user = this.userRepository.create(createUserDto);
    user.password = bcrypt.hashSync(user.password, 10);
    return this.userRepository.save(user);
  }

  async findOne(username: string) {
    const user = await this.userRepository
      .createQueryBuilder('user')
      .where('user.username = :username', { username })
      .getOne();

    if (!user) return null;
    return user;
  }

  async updateUser(id: number, userDto: UserUpdateDto) {
    const user = await this.userRepository.findOneBy({ id });
    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    if (userDto.password) {
      userDto.password = await bcrypt.hash(userDto.password, 10);
    }

    await this.userRepository.update(id, userDto);
    return this.userRepository.findOneBy({ id });
  }

  findOneById(id: number) {
    return this.userRepository.findOne({ where: { id } });
  }
}
