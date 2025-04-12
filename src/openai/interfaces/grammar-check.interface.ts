export interface GrammarCheckResponse {
  correctedText: string;
  suggestions: string[];
  errors: {
    type: string;
    message: string;
    suggestion: string;
  }[];
} 