import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from './user.model';
import { JwtService } from './jwt.service';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private readonly jwtService: JwtService,
  ) { }

  async validateUser(githubId: string, username: string): Promise<UserDocument> {
    let user = await this.userModel.findOne({ githubId });

    if (!user) {
      user = await this.userModel.create({
        githubId,
        username,
        subscription: {
          plan: 'free',
          startDate: new Date(),
          endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          active: true
        }
      });
    }

    return user;
  }

  async generateToken(user: UserDocument): Promise<string> {
    const payload = {
      sub: user._id.toString(),
      username: user.username,
      githubId: user.githubId,
    };
    return this.jwtService.generateToken(payload);
  }

  async createUser(profile: any): Promise<UserDocument> {
    const newUser = new this.userModel({
      githubId: profile.githubId,
      username: profile.username,
      email: profile.email,
      avatarUrl: profile.avatarUrl,
      githubAccessToken: profile.accessToken,
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

  async registerGitHubUser(userData: {
    githubId: string;
    email: string;
    name: string;
    username: string;
    avatar: string;
    accessToken: string;
  }) {
    let user = await this.userModel.findOne({ githubId: userData.githubId });
    
    if (!user) {
      user = await this.userModel.create({
        githubId: userData.githubId,
        username: userData.username,
        name: userData.name,
        email: userData.email,
        avatarUrl: userData.avatar,
        githubAccessToken: userData.accessToken,
        subscription: {
          plan: 'free',
          startDate: new Date(),
          endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          active: true
        }
      });
    } else {
      user = await this.userModel.findOneAndUpdate(
        { githubId: userData.githubId },
        {
          $set: {
            email: userData.email,
            username: userData.username,
            avatarUrl: userData.avatar,
            githubAccessToken: userData.accessToken,
          }
        },
        { new: true }
      );
    }

    return this.login(user);
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