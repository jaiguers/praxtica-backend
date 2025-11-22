import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from './jwt.service';
import { WsException } from '@nestjs/websockets';

@Injectable()
export class JwtWebSocketGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    let client: any;
    let data: any;

    // Intentar obtener el cliente según el tipo de contexto
    try {
      client = context.switchToWs().getClient();
      data = context.switchToWs().getData();
    } catch {
      // Si no es un contexto WebSocket de mensaje, puede ser de conexión
      // En ese caso, el cliente puede estar en el contexto de otra manera
      const wsContext = context.switchToWs();
      client = wsContext.getClient();
      data = wsContext.getData();
    }

    // Intentar obtener el token de diferentes lugares
    let token: string | undefined;

    // 1. Del handshake query parameters (ej: ?token=xxx)
    if (client?.handshake?.query?.token) {
      token = Array.isArray(client.handshake.query.token)
        ? client.handshake.query.token[0]
        : client.handshake.query.token;
    }

    // 2. Del handshake auth object (ej: auth: { token: 'xxx' })
    if (!token && client?.handshake?.auth?.token) {
      token = client.handshake.auth.token;
    }

    // 3. Del header Authorization (si está disponible en el handshake)
    if (!token && client?.handshake?.headers?.authorization) {
      const authHeader = client.handshake.headers.authorization;
      const [type, tokenValue] = authHeader.split(' ');
      if (type === 'Bearer') {
        token = tokenValue;
      }
    }

    // 4. Del payload del mensaje (última opción, menos segura)
    if (!token && data?.token) {
      token = data.token;
    }

    if (!token) {
      throw new WsException('Token no proporcionado');
    }

    try {
      const payload = await this.jwtService.verifyToken(token);
      if (!payload) {
        throw new WsException('Token inválido');
      }

      // Almacenar el usuario en el socket para uso posterior
      // El token JWT usa 'sub' para el userId (ver auth.service.ts generateToken)
      if (client) {
        client.data = client.data || {};
        client.data.user = payload;
        client.data.userId = payload.sub || payload.id || payload.userId;
      }

      return true;
    } catch (error) {
      if (error instanceof WsException) {
        throw error;
      }
      throw new WsException('Token inválido');
    }
  }
}

