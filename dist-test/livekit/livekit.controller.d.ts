import { LiveKitService } from './livekit.service';
export declare class LiveKitController {
    private readonly livekitService;
    constructor(livekitService: LiveKitService);
    getToken(req: any, body: any): Promise<{
        token: string;
    }>;
}
