import { Injectable } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';

@Injectable()
export class UserService {
    private users = [
        { id: 1, name: '小明', age: 18, passwd: '123' },
        { id: 2, name: '小白', age: 19, passwd: '123' }
    ]

    getUsers() {
        return this.users
    }

    createUser(createUserDto: CreateUserDto) {
        const newUser = { id: Date.now(), ...createUserDto }
        this.users.push(newUser)
        return newUser
    }

    findOne(username: string) {
        const user =  this.users.find(item => item.name === username)

        return Promise.resolve(user)
    }
}
