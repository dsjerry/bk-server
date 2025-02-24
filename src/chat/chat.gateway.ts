import { WebSocketGateway, WebSocketServer, OnGatewayConnection, OnGatewayDisconnect, SubscribeMessage } from '@nestjs/websockets'
import { Server, Socket } from 'socket.io'

export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer() server: Server

    handleConnection(client: Socket, ...args: any[]) {
       console.log(`Client connected: ${client.id}`) 
    }

    handleDisconnect(client: Socket) {
        console.log(`Client disconnected: ${client.id}`)
    }

    @SubscribeMessage('message')
    handleMessage(client: Socket, payload: string): void {
        this.server.emit('message', payload)    // 广播消息给所有客户端
    }
}