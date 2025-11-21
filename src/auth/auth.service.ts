import { Injectable, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument, AuthProvider } from './user.model';
import { JwtService } from './jwt.service';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private readonly jwtService: JwtService,
  ) { }

  async validateUserByProvider(
    provider: AuthProvider,
    providerId: string
  ): Promise<UserDocument | null> {
    // Buscar usuario por providerId en authProviders Map
    return this.userModel.findOne({
      [`authProviders.${provider}.providerId`]: providerId
    }).exec();
  }

  async validateUser(githubId: string, username: string): Promise<UserDocument> {
    let user = await this.userModel.findOne({
      $or: [
        { githubId },
        { 'authProviders.github.providerId': githubId }
      ]
    });

    if (!user) {
      // Este método legacy se mantiene para compatibilidad
      // Pero ahora requiere email
      throw new Error('validateUser legacy method requires email. Use registerUserByProvider instead.');
    }

    return user;
  }

  async generateToken(user: UserDocument): Promise<string> {
    const payload = {
      sub: user._id.toString(),
      username: user.username,
      email: user.email,
    };
    return this.jwtService.generateToken(payload);
  }

  async createUser(profile: any): Promise<UserDocument> {
    // Método legacy - usar registerUserByProvider en su lugar
    // Se mantiene para compatibilidad pero ahora usa la nueva estructura
    const authProviders = new Map();
    if (profile.githubId && profile.accessToken) {
      authProviders.set('github', {
        provider: 'github' as AuthProvider,
        providerId: profile.githubId,
        accessToken: profile.accessToken,
        email: profile.email,
        connectedAt: new Date(),
      });
    }

    const newUser = new this.userModel({
      email: profile.email,
      username: profile.username,
      name: profile.name,
      avatarUrl: profile.avatarUrl,
      authProviders,
      // Mantener compatibilidad con campos legacy de GitHub
      ...(profile.githubId && {
        githubId: profile.githubId,
        githubAccessToken: profile.accessToken,
      }),
      subscription: {
        plan: 'free',
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 1 mes para plan free
        active: true,
      },
      challengeProgress: [],
    });

    return newUser.save();
  }

  async login(user: UserDocument) {
    const token = await this.generateToken(user);

    return {
      user: {
        id: user._id.toString(),
        username: user.username,
        name: user.name,
        email: user.email,
        ranking: user.ranking,
        avatarUrl: user.avatarUrl,
        subscription: user.subscription,
        challengeProgress: user.challengeProgress,
      },
      token,
    };
  }

  /**
   * Migra un usuario legacy (con campos githubId/githubAccessToken) a la nueva estructura authProviders
   */
  private migrateLegacyUser(
    user: UserDocument,
    provider: AuthProvider,
    userData: {
      providerId: string;
      accessToken: string;
      refreshToken?: string;
      email: string;
    }
  ): void {
    if (provider !== 'github' || !user.githubId) {
      return; // Solo migrar usuarios legacy de GitHub
    }

    // Inicializar authProviders si no existe
    if (!user.authProviders) {
      user.authProviders = new Map();
    }

    // Si ya tiene el proveedor, no migrar
    if (user.authProviders.has(provider)) {
      return;
    }

    // Normalizar ambos valores a string para comparar (githubId puede ser número en DB)
    const normalizedGithubId = String(user.githubId);
    const normalizedProviderId = String(userData.providerId);

    // Migrar datos legacy a authProviders
    if (normalizedGithubId === normalizedProviderId) {
      user.authProviders.set(provider, {
        provider,
        providerId: normalizedGithubId, // Guardar como string para consistencia
        accessToken: user.githubAccessToken || userData.accessToken,
        refreshToken: userData.refreshToken,
        email: user.email,
        connectedAt: user.createdAt || new Date(),
      });
    }
  }

  /**
   * Verifica si un usuario puede autenticarse con el proveedor dado
   */
  private canAuthenticateWithProvider(
    user: UserDocument,
    provider: AuthProvider,
    providerId: string
  ): boolean {
    // Si no tiene authProviders, verificar campos legacy para GitHub
    if (!user.authProviders || user.authProviders.size === 0) {
      if (provider === 'github' && user.githubId) {
        // Normalizar ambos valores a string para comparar (githubId puede ser número en DB)
        const normalizedGithubId = String(user.githubId);
        const normalizedProviderId = String(providerId);
        if (normalizedGithubId === normalizedProviderId) {
          return true;
        }
      }
      return false;
    }

    const providerData = user.authProviders.get(provider);
    if (!providerData) {
      return false;
    }

    // Normalizar ambos valores a string para comparar
    const normalizedStoredId = String(providerData.providerId);
    const normalizedProviderId = String(providerId);
    return normalizedStoredId === normalizedProviderId;
  }

  /**
   * Actualiza los datos del proveedor y del usuario
   */
  private updateUserProviderData(
    user: UserDocument,
    provider: AuthProvider,
    userData: {
      providerId: string;
      accessToken: string;
      refreshToken?: string;
      email: string;
      name?: string;
      username: string;
      avatar: string;
    }
  ): void {
    // Asegurar que authProviders existe
    if (!user.authProviders) {
      user.authProviders = new Map();
    }

    // Obtener providerData existente para preservar connectedAt
    const existingProviderData = user.authProviders.get(provider);
    const connectedAt = existingProviderData?.connectedAt || user.createdAt || new Date();

    // Actualizar datos del proveedor
    user.authProviders.set(provider, {
      provider,
      providerId: userData.providerId,
      accessToken: userData.accessToken,
      refreshToken: userData.refreshToken,
      email: userData.email,
      connectedAt,
    });

    // Actualizar datos del usuario si han cambiado
    if (userData.name) user.name = userData.name;
    if (userData.avatar) user.avatarUrl = userData.avatar;
    if (userData.username) user.username = userData.username;

    // Mantener compatibilidad con campos legacy de GitHub
    if (provider === 'github') {
      user.githubId = userData.providerId;
      user.githubAccessToken = userData.accessToken;
    }
  }

  /**
   * Crea un nuevo usuario con el proveedor dado
   */
  private async createUserWithProvider(
    provider: AuthProvider,
    userData: {
      providerId: string;
      email: string;
      name?: string;
      username: string;
      avatar: string;
      accessToken: string;
      refreshToken?: string;
    }
  ): Promise<UserDocument> {
    const authProviders = new Map();
    authProviders.set(provider, {
      provider,
      providerId: userData.providerId,
      accessToken: userData.accessToken,
      refreshToken: userData.refreshToken,
      email: userData.email,
      connectedAt: new Date(),
    });

    return this.userModel.create({
      email: userData.email,
      username: userData.username,
      name: userData.name,
      avatarUrl: userData.avatar,
      authProviders,
      // Mantener compatibilidad con campos legacy de GitHub
      ...(provider === 'github' && {
        githubId: userData.providerId,
        githubAccessToken: userData.accessToken,
      }),
      subscription: {
        plan: 'free',
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 días
        active: true,
      },
    });
  }

  /**
   * Maneja el login o registro de un usuario mediante un proveedor de autenticación.
   * Si el usuario existe con ese email y proveedor → LOGIN
   * Si el usuario existe con ese email pero otro proveedor → ERROR
   * Si el usuario no existe → REGISTRO
   */
  async loginOrRegisterByProvider(
    provider: AuthProvider,
    userData: {
      providerId: string;
      email: string;
      name?: string;
      username: string;
      avatar: string;
      accessToken: string;
      refreshToken?: string;
    }
  ) {
    // Buscar usuario existente por email
    const existingUser = await this.userModel.findOne({
      email: userData.email,
    }).exec();

    if (existingUser) {
      // Migrar usuario legacy si es necesario
      this.migrateLegacyUser(existingUser, provider, userData);
      console.log('migrateLegacyUser OK');

      // Verificar si puede autenticarse con este proveedor
      if (this.canAuthenticateWithProvider(existingUser, provider, userData.providerId)) {
        console.log('canAuthenticateWithProvider OK', existingUser);
        // LOGIN: Usuario existe con ese email y proveedor
        this.updateUserProviderData(existingUser, provider, userData);
        console.log('updateUserProviderData OK', existingUser);
        await existingUser.save();
        return this.login(existingUser);
      } else {
        // ERROR: Usuario existe con ese email pero con otro proveedor
        throw new ConflictException(
          `Ya existe un usuario con el email ${userData.email}. El email debe ser único independientemente del proveedor de autenticación.`
        );
      }
    }

    // REGISTRO: Usuario no existe, crear nuevo
    const newUser = await this.createUserWithProvider(provider, userData);
    return this.login(newUser);
  }

  // Métodos de compatibilidad - ahora usan loginOrRegisterByProvider
  async registerGitHubUser(userData: {
    githubId: string;
    email: string;
    name: string;
    username: string;
    avatar: string;
    accessToken: string;
  }) {
    return this.loginOrRegisterByProvider('github', {
      providerId: userData.githubId,
      email: userData.email,
      name: userData.name,
      username: userData.username,
      avatar: userData.avatar,
      accessToken: userData.accessToken,
    });
  }

  async registerGmailUser(userData: {
    googleId: string;
    email: string;
    name?: string;
    username: string;
    avatar: string;
    accessToken: string;
    refreshToken: string;
  }) {
    return this.loginOrRegisterByProvider('gmail', {
      providerId: userData.googleId,
      email: userData.email,
      name: userData.name,
      username: userData.username,
      avatar: userData.avatar,
      accessToken: userData.accessToken,
      refreshToken: userData.refreshToken,
    });
  }

  async registerOutlookUser(userData: {
    microsoftId: string;
    email: string;
    name?: string;
    username: string;
    avatar: string;
    accessToken: string;
    refreshToken: string;
  }) {
    return this.loginOrRegisterByProvider('outlook', {
      providerId: userData.microsoftId,
      email: userData.email,
      name: userData.name,
      username: userData.username,
      avatar: userData.avatar,
      accessToken: userData.accessToken,
      refreshToken: userData.refreshToken,
    });
  }

  async findUserById(id: string): Promise<UserDocument> {
    return this.userModel.findById(id);
  }

  async updateSubscription(userId: string, subscriptionData: any): Promise<UserDocument> {
    return this.userModel.findByIdAndUpdate(
      userId,
      {
        $set: {
          subscription: {
            ...subscriptionData,
            active: true
          }
        }
      },
      { new: true }
    );
  }
} 