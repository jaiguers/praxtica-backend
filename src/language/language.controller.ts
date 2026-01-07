import {
  Body,
  Controller,
  MessageEvent,
  Param,
  Patch,
  Post,
  Sse,
  UseGuards,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { LanguageService } from './language.service';
import { MigrationService } from './migration.service';
import { CreateLanguageTestDto } from './dto/create-language-test.dto';
import { StartPracticeSessionDto } from './dto/start-practice-session.dto';
import { CompletePracticeSessionDto } from './dto/complete-practice-session.dto';

@Controller('api/language')
@UseGuards(JwtAuthGuard)
export class LanguageController {
  constructor(
    private readonly languageService: LanguageService,
    private readonly migrationService: MigrationService,
  ) {}

  @Post('users/:userId/tests')
  createLanguageTest(
    @Param('userId') userId: string,
    @Body() dto: CreateLanguageTestDto,
  ) {
    return this.languageService.createLanguageTest(userId, dto);
  }

  @Post('users/:userId/practice-sessions')
  startPracticeSession(
    @Param('userId') userId: string,
    @Body() dto: StartPracticeSessionDto,
  ) {
    return this.languageService.startPracticeSession(userId, dto);
  }

  @Patch('users/:userId/practice-sessions/:sessionId/complete')
  completePracticeSession(
    @Param('userId') userId: string,
    @Param('sessionId') sessionId: string,
    @Body() dto: CompletePracticeSessionDto,
  ) {
    return this.languageService.completePracticeSession(userId, sessionId, dto);
  }

  @Post('migrate/practice-session-titles')
  async migratePracticeSessionTitles() {
    return this.migrationService.migratePracticeSessionTitles();
  }

  @Sse('users/:userId/practice-sessions/:sessionId/stream')
  streamPracticeSession(
    @Param('sessionId') sessionId: string,
  ): Observable<MessageEvent> {
    return this.languageService.getSessionStream(sessionId);
  }
}

