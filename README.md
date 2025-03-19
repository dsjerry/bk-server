---
title: nestjs学习日记
toc: true
date: 2025-02-15 10:13:54
tags: [js,ts,mysql]
categories: 后端学习
thumbnail: https://s21.ax1x.com/2025/02/17/pEM3hqS.png
cover: https://s21.ax1x.com/2025/02/17/pEM3hqS.png
---

🗨️ 问一下DeepSeek今天要学什么

<!-- more -->

# 安装与运行

```shell
npm i -g @nestjs/cli
```

（typescript）安装*express*的声明文件

```shell
npm i @types/express
```

运行（生产）

```shell
npm start
```

- 生产模式启动，适用于部署环境、测试生产环境的启动流程（是运行生产环境代码）
- 不监听文件变化

运行（开发）

```shell
npm run start:dev
```

- 热更新
- 详细的日志输出
- 启动慢

加快构建速度（使用*swc*）

```shell
npm run start -- -b swc
```

构建生产环境代码

```shell
npm run build
```

- 将ts代码编译为js代码
- 后续部署

# 术语表

- 装饰器（Decorator）：一种函数，使用时需要以`@`开头放在需要装饰的代码上方，旨在不修改代码的前提下给代码拓展功能

- JWT

# 解答

- 为什么说是集成*express*，因为例如请求、相应对象是相通的

# 学习日记

## D1

1. 创建一个模块
2. 连接数据库
3. 添加Swagger文档
4. 错误处理

### 基础模块

创建一个`user`模块（生成模块必须文件和可选的`.spec.ts`的测试文件），可使用`nest g --help`查看更多命令

```shell
nest g resource user
```

- 一般选择`REST API`
- 创建的模块会自动更新`app.module.ts`文件
- 此命令不会创建`dto`文件（用来规范客户端与服务端之间的数据格式），需手动创建
- 文件一般被放在如`user/dto/create-user.dto.ts`这里

![目录结构](https://s21.ax1x.com/2025/03/03/pEG7a0e.png)

编辑后的代码示例：

`user.controller.ts`（控制器）接收请求，具体的业务逻辑由`use.service.ts`文件提供

```ts
import { Controller, Get, Post, Body } from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';

// 当前接口，如 localhost:3000/user
// 此装饰器是控制器必须的
@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get()
  getUsers() {
    return this.userService.getUsers()
  }

  // 这里Body装饰器的作用是从 http请求体 中提取数据，并且绑定到方法的参数上
  // 并且可讲数据类型自动转换为 dto 中的类型
  @Post()
  createUser(@Body() createUserDto: CreateUserDto) {
    this.userService.createUser(createUserDto)
  }
}
```

`use.service.ts`（提供器、服务）处理更为复杂的业务需求

```ts
import { Injectable } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';

// 此装饰器是服务必须的
@Injectable()
export class UserService {
    private users = [
        { id: 1, name: '小明', age: 18 },
        { id: 2, name: '小白', age: 19 }
    ]

    getUsers() {
        return this.users
    }

    createUser(createUserDto: CreateUserDto) {
        const newUser = { id: Date.now(), ...createUserDto }
        this.users.push(newUser)
        return newUser
    }
}
```

`create-user.dto.ts`（Data Transfer Object、数据传输对象）可单独作为一个普通dto来使用

```ts
export class CreateUserDto {
    name: string
    age: number
}
```

还可以结合`class-validator`（需要额外安装）来实现更高效的验证

```shell
npm install class-validator class-transformer
```

```ts
import { IsString, IsEmail, MinLength } from 'class-validator'

export class CreateUserDto {
    @IsString()
    @MinLength(2)
    name: string

    age: number
    
    @IsEmail()
    email: string
}
```

### 连接数据库

使用`typeorm`连接数据库

```shell
npm install @nestjs/typeorm
```

在`app.module.ts`中全局配置

```ts
import { TypeOrmModule } from '@nestjs/typeorm';

// ...

@Module({
  imports: [
    UserModule,
    AuthModule,
    // forRoot 用于设置模块的全局配置选项
    TypeOrmModule.forRoot({
      type: 'mysql',
      host: 'localhost',
      port: 3306,
      username: 'root',
      password: '123456',
      database: 'nestjs',
      entities: [User],
      synchronize: true,
    }),
  ],
  controllers: [AppController],
  providers: [AppService],
})

// ...
```

通过`entities`创建一个用户表，一般在当前模块下创建，如`user/entities/user.entity.ts`

```ts
import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column()
  age: number;

  @Column()
  passwd: string;

  @Column({ default: true })
  isActive: boolean;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createTime: Date;
}
```

随后在`user.modules.ts`中导入，一旦导入就会自动创建数据表（typeorm配置时，`synchronize`设为`true`）

```ts
import { User } from './entities/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User])],
  controllers: [UserController],
  providers: [UserService],
  exports: [UserService],
})
```

通过接口创建一条数据（控制器 -> 服务），在`users.service.ts`中通过`Repository`来执行，它提供了很多操作数据库的方法（find, create等）。有了这个，在绝大多数情况下不需要写SQL

> 以下代码中，实际起到作用的是`InjectRepository`，`Repository`在此只起到类型的作用


```ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateUserDto } from './dto/create-user.dto';
import { User } from './entities/user.entity';

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
        return this.userRepository.save(user);
    }

    findOne(username: string) {
        const user = this.userRepository.findOne({ where: { name: username } })

        return Promise.resolve(user)
    }
}   

```

### 添加Swagger文档

```shell
npm install @nestjs/swagger
```

修改`main.ts`以配置swagger，访问文档`http://localhost:3000/api`

```ts
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const config = new DocumentBuilder()
    .setTitle('NestJS学习')
    .setDescription('NestJS学习API文档')
    .setVersion('1.0')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);    // api 指定文档的访问路径

  await app.listen(3000);
}
```

在`main.ts`文件中相当于初始化swagger，具体的接口描述可以使用swagger提供的装饰器在具体的接口中使用

```ts
import { ApiTags } from '@nestjs/swagger';

@ApiTags('user')
@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get()
  getUsers() {
    return this.userService.getUsers()
  }
}
```


### 错误处理

创建文件`src/filters/http-exception.filter.ts`

```ts
import { ExceptionFilter, Catch, ArgumentsHost } from '@nestjs/common';
import { Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: Error, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    response.status(500).json({
      message: 'Internal Server Error',
      error: exception.message,
    });
  }
}
```

修改`main.ts`以全局注册过滤器

```ts
app.useGlobalFilters(new HttpExceptionFilter());
```

## D2

1. 用户认证（JWT）
2. 中间件实战（日志级联）
3. 环境配置
4. 单元测试入门
5. 部署优化（生产环境配置）

### JWT

```shell
npm install @nestjs/jwt @nestjs/passport passport passport-jwt bcrypt
npm install @types/passport-jwt @types/bcrypt --save-dev
```

创建认证模块

```shell
nest g resource auth
```
![成功创建](https://s21.ax1x.com/2025/03/03/pEG70kd.png)

实现用户注册（需要创建和数据库对应的entity），如：

`src/user/entities/user.entity.ts`

```ts
export class User {
  id: number
  username: string
  password: string // 实际保存为哈希值
}
```

修改`auth.service.ts`实现登录相关的业务逻辑（获取用户数据，实现成功登录token返回）

```ts
import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt'
import * as bcrypt from 'bcrypt'
import { UserService } from '../user/user.service';

@Injectable()
export class AuthService {
    constructor(private userService: UserService,
        private jwtService: JwtService
    ){}

    async validateUser(username: string, pass: string): Promise<any> {
        const user = await this.userService.findOne(username)
        if (user && (await bcrypt.compare(pass, user.passwd))) {
            // 返回除密码外的其他数据（实用的操作）
            const { passwd, ...result} = user
            return result
        }
        return null
    }

    async login(user: any) {
        const payload = { username: user.username, sub: user.id }
        return {
            access_token: this.jwtService.sign(payload)
        }
    }
}

```

修改`auth.controller.ts`

```ts
import { Controller, Body, Post, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // dto也不一定需要写在单独的文件，行内也可以
  @Post('login')
  async login(@Body() loginDto: { username: string; password: string }) {
    const user = await this.authService.validateUser(loginDto.username, loginDto.password)
    if (!user) throw new UnauthorizedException();
    return this.authService.login(user)    
  }
}
```

修改`auth.module.ts`文件配置JWT模块

```ts
import { JwtModule } from '@nestjs/jwt';

@Module({
  imports: [
    JwtModule.register({
      secret: 'your_secret_key',
      signOptions: { expiresIn: '1h' },
    }),
  ],
  providers: [AuthService],
})
export class AuthModule {}
```

### 中间件

中间件一般会保存到如：

`src/middleware/logger.middleware.ts`

```ts
import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
  }
}
```

修改`app.module.ts`中全局应用中间件

```ts
import {  NestModule, MiddlewareConsumer } from '@nestjs/common';
import { LoggerMiddleWare } from './middleware/logger.middleware';

export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(LoggerMiddleWare)
      .forRoutes('*');
  }
}
```

### 环境配置

> 通过`.env`文件来区分不同环境

```shell
npm install @nestjs/config
```

修改`app.module.ts`进行配置

```ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config'
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UserModule } from './user/user.module';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [UserModule, AuthModule, ConfigModule.forRoot({
    isGlobal: true,
    envFilePath: `.env.${process.env.NODE_ENV || 'development'}`
  })],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
```

本地创建两个不同的环境变量文件：`.env.development` 和 `.env.production`

```
# .env.development
DATABASE_URL=sqlite:./dev.db
JWT_SECRET=development_secret

# .env.production
DATABASE_URL=mysql://user:password@localhost:3306/prod_db
JWT_SECRET=production_secret
```

### 单元测试

> 单元测试文件在运行`nest g resource xx`的时候会自动创建，也可手动创建

例如测试`UserService`，修改`user.service.spec.ts`

```ts
import { Test, TestingModule } from '@nestjs/testing';
import { UserService } from './user.service';

describe('UserService', () => {
  let service: UserService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [UserService],
    }).compile();

    service = module.get<UserService>(UserService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('show return users', () => {
    expect(service.getUsers()).toEqual([
      { id: 1, name: '小明', age: 18, passwd: '123' },
      { id: 2, name: '小白', age: 19, passwd: '123' }
    ])
  })
});
```

运行测试

```shell
npm run test
```

### 部署优化

运行`npm run start`的时候已经是生产环境，除此之外还可以打包之后再部署（可使用*swc*、*pm2*等进行打包）

安装swc

```shell
npm install --save-dev @swc/cli @swc/core
```

在项目根目录下创建`.swc`文件，并且添加打包命令到 npm-script，如`"build": "swc src -d dist"`

```
{
  "jsc": {
    "parser": {
      "syntax": "typescript",
      "tsx": false,
      "decorators": true,
      "dynamicImport": true
    },
    "target": "es2020",
    "keepClassNames": true,
    "transform": {
      "legacyDecorator": true,
      "decoratorMetadata": true
    }
  },
  "module": {
    "type": "commonjs"
  }
}
```

使用docker进行容器部署，在项目根目录创建`Dockerfile`文件（必须大写开头）

```dockerfile
# 使用 Node.js 官方镜像
FROM node:16

# 设置工作目录
WORKDIR /app

# 复制 package.json 和 package-lock.json
COPY package*.json ./

# 安装依赖
RUN npm install --production

# 复制源代码
COPY . .

# 构建应用
RUN npm run build

# 暴露端口
EXPOSE 3000

# 启动应用
CMD ["node", "dist/main.js"]
```

构建镜像和运行容器

```shell
# 构建 Docker 镜像
docker build -t my-nest-app .

# 运行 Docker 容器
docker run -p 3000:3000 my-nest-app
```

使用nginx进行反向代理（处理跨域的好方法），当访问`yourdomain.com/api`时代理到本地的`3000`端口

```nginx
server {
    listen 80;
    server_name yourdomain.com;

    location /api {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

## D3

1. 权限守卫
2. 文件上传与静态资源托管
3. WebSocket实时通信

### 权限守卫

创建角色装饰器，新建文件`src/auth/roles.decorator.ts`：

```ts
import { SetMetadata } from '@nestjs/common';

export const Roles = (...roles: string[]) => SetMetadata('roles', roles);
```

实现守卫，新建文件`src/auth/roles.guard.ts`：

```ts
import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common'
import { Reflector } from '@nestjs/core'

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}
  canActivate(context: ExecutionContext): boolean {
    // 获取接口所需的角色
    const requiredRoles = this.reflector.get<string[]>(
      'roles',
      context.getHandler(),
    );
    if (!requiredRoles) return true;

    // 模拟从请求中获取用户角色（实际应从 JWT 解析）
    const request = context.switchToHttp().getRequest();
    const user = request.user; // 假设 user 已通过 JWT 中间件注入
    return requiredRoles.some((role) => user.roles?.includes(role));
  }
}
```

在控制器中使用守卫，如:

```ts
// src/users/users.controller.ts
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';

@Controller('users')
@UseGuards(RolesGuard) // 全局应用守卫，或在模块中全局注册
export class UserController {
  @Get('admin')
  @Roles('admin') // 仅允许 admin 角色访问
  getAdminData() {
    return { message: 'Admin data' };
  }
}
```

### 文件上传与静态资源托管

#### 文件上传

需要外安装依赖

```bash
npm install @nestjs/platform-express multer
```

```bash
npm install @types/multer --save-dev
```

创建文件上传控制器：`src/files/files.controller.ts`

```ts
import { Controller, Post, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';

@Controller('files')
export class FilesController {
  @Post('upload')
  @UseInterceptors(FileInterceptor('file', {
    storage: diskStorage({
      destination: './uploads',
      filename: (req, file, callback) => {
        const randomName = Array(32).fill(null).map(() => Math.round(Math.random() * 16).toString(16)).join('');
        callback(null, `${randomName}${extname(file.originalname)}`);
      },
    }),
  }))
  uploadFile(@UploadedFile() file: Express.Multer.File) {
    return {
      url: `/static/${file.filename}`,
    };
  }
}
```

- `FileInterceptor`：文件上传拦截器（第一个参数是文件字段名（`formData`中的键名）

托管静态文件，在`main.ts`中配置

```ts
// src/main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { join } from 'path';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // 静态文件托管, 一般会指定到非源码目录
  app.use('/static', express.static(join(__dirname, '..', 'uploads')));
  await app.listen(3000);
}
bootstrap();
```

#### 静态资源托管

除了上面的方式外，常用的处理方法还有

- 使用 nginx 作为静态文件服务器
- 使用 CDN 服务（阿里云OOS + CDN、腾讯云COS + CDN）
- nestjs 自带的`ServeStaticModule`模块

在 nginx 中配置：

```nginx
server {
    listen 80;
    server_name yourdomain.com;

    location /static/ {
        alias /var/www/static/; # 静态资源目录
    }

    location / {
        proxy_pass http://localhost:3000; # 反向代理到 NestJS 应用
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

使用`ServeStaticModule`，预先安装：

```bash
npm install @nestjs/serve-static
```

在`app.module.ts`中配置:

```ts
// src/app.module.ts
import { Module } from '@nestjs/common';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';

@Module({
  imports: [
    ServeStaticModule.forRoot({
      rootPath: '/var/www/static', // 静态资源目录
      serveRoot: '/static', // 访问路径
    }),
  ],
})
export class AppModule {}
```
