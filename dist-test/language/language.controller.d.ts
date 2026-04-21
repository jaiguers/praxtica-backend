import { MessageEvent } from '@nestjs/common';
import { Observable } from 'rxjs';
import { LanguageService } from './language.service';
import { MigrationService } from './migration.service';
import { CreateLanguageTestDto } from './dto/create-language-test.dto';
import { StartPracticeSessionDto } from './dto/start-practice-session.dto';
import { CompletePracticeSessionDto } from './dto/complete-practice-session.dto';
export declare class LanguageController {
    private readonly languageService;
    private readonly migrationService;
    constructor(languageService: LanguageService, migrationService: MigrationService);
    createLanguageTest(userId: string, dto: CreateLanguageTestDto): Promise<import("../schemas/user.schema").LanguageTest>;
    startPracticeSession(userId: string, dto: StartPracticeSessionDto): Promise<import("../schemas/user.schema").PracticeSession>;
    completePracticeSession(userId: string, sessionId: string, dto: CompletePracticeSessionDto): Promise<import("../schemas/user.schema").PracticeSession>;
    migratePracticeSessionTitles(): Promise<{
        updated: number;
        total: number;
    }>;
    streamPracticeSession(sessionId: string): Observable<MessageEvent>;
}
