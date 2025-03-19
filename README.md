# nestjs学习日记

🚧 建设中...

👉 [文章地址](https://smalljerry.cn/2025/02/15/nestjs/)

## 安装与运行

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