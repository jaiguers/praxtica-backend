import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from '../user.model';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) {}

  async findById(id: string): Promise<UserDocument | null> {
    return this.userModel.findById(id).exec();
  }

  async getRanking(userId: string): Promise<number> {
    const user = await this.findById(userId);
    return user?.ranking || 1;
  }

  async getTopUsers(limit: number = 10): Promise<{ username: string; ranking: number }[]> {
    return this.userModel
      .find()
      .sort({ ranking: -1 })
      .limit(limit)
      .select('username ranking')
      .exec();
  }

  async getUserPosition(userId: string): Promise<number> {
    const user = await this.findById(userId);
    if (!user) {
      throw new Error('Usuario no encontrado');
    }

    const position = await this.userModel
      .countDocuments({ ranking: { $gt: user.ranking } })
      .exec();

    return position + 1;
  }
} 