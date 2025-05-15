import { Injectable } from '@nestjs/common';
import OpenAI from 'openai';
import { GrammarCheckResponse } from './interfaces/grammar-check.interface';

interface ConversationMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

@Injectable()
export class OpenAIService {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  async checkGrammar(text: string): Promise<GrammarCheckResponse> {
    try {
      const prompt = `
      You are an English grammar correction assistant.

      Correct the grammar in the following sentence and return a JSON object with the following structure:

      {
        "original": [original sentence],
        "corrected": [corrected version],
        explanation": [a brief explanation of the grammar correction. If the sentence is already grammatically correct, do not explain anything—just write: "The sentence is already grammatically correct."],
        "suggestion": [a more natural or advanced way to say it, if possible],
        "errors": [
          {
            "type": [one of: "grammar", "vocabulary", "spelling"],
            "message": [explanation of this specific error],
            "suggestion": [how to fix this specific error]
          }
        ]
      }

      Only respond with valid JSON. Do not include any extra text.

      Sentence: "${text}"`;

      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.4,
        max_tokens: 500
      });

      const grammarResult = JSON.parse(response.choices[0].message.content);

      // Preparar la respuesta con valores predeterminados
      const grammarCheckResponse: GrammarCheckResponse = {
        correctedText: grammarResult.corrected,
        suggestions: [],
        errors: []
      };

      // Verificar si la oración ya es gramaticalmente correcta
      const isCorrect = grammarResult.explanation.includes("The sentence is already grammatically correct");
      // Asignar sugerencias basadas en disponibilidad de suggestion
      const hasSuggestion = grammarResult.suggestion && grammarResult.suggestion.trim() !== '';
      grammarCheckResponse.suggestions = hasSuggestion
        ? [grammarResult.explanation, grammarResult.suggestion]
        : [grammarResult.explanation, grammarResult.corrected];

      if (!isCorrect) {
        // Verificar si hay errores de tipo "grammar"
        const hasGrammarErrors = grammarResult.errors &&
          Array.isArray(grammarResult.errors) &&
          grammarResult.errors.some(error => error && error.type === 'grammar');

        if (hasGrammarErrors) {
          // Filtrar solo los errores de tipo "grammar"
          const grammarErrors = grammarResult.errors.filter(error =>
            error &&
            typeof error === 'object' &&
            typeof error.type === 'string' &&
            error.type === 'grammar' &&
            typeof error.message === 'string' &&
            typeof error.suggestion === 'string'
          );

          grammarCheckResponse.errors = grammarErrors;
          grammarCheckResponse.suggestions = [grammarCheckResponse.errors[0].message, grammarCheckResponse.errors[0].suggestion, grammarResult.corrected];

        } else {
          // Si no hay errores de tipo "grammar", procesar otros tipos de errores
          if (grammarResult.errors && Array.isArray(grammarResult.errors) && grammarResult.errors.length > 0) {
            // Validar y filtrar errores por tipo
            const validErrors = grammarResult.errors.filter(error =>
              error &&
              typeof error === 'object' &&
              typeof error.type === 'string' &&
              typeof error.message === 'string' &&
              typeof error.suggestion === 'string' &&
              ['vocabulary', 'spelling'].includes(error.type)
            );

            grammarCheckResponse.errors = validErrors;
          } else {
            // Si no hay errores específicos pero la explicación indica que hay correcciones
            grammarCheckResponse.errors = [{
              type: 'vocabulary',
              message: grammarResult.explanation,
              suggestion: grammarResult.corrected
            }];
          }

        }
      }

      return grammarCheckResponse;
    } catch (error) {
      console.error('Error checking grammar:', error);
      throw new Error('Could not check grammar');
    }
  }

  async checkSpanishGrammar(text: string): Promise<GrammarCheckResponse> {
    try {
      const prompt = `
      Eres es un asistente de corrección gramatical en español.

      Corrige la gramática de la siguiente frase y devuelve un objeto JSON con la siguiente estructura:

      {
        "original": [original sentence],
        "corrected": [corrected version],
        explanation": [a brief explanation of the grammar correction. If the sentence is already grammatically correct, do not explain anything—just write: "The sentence is already grammatically correct."],
        "suggestion": [a more natural or advanced way to say it, if possible],
        "errors": [
          {
            "type": [one of: "grammar", "vocabulary", "spelling"],
            "message": [explanation of this specific error],
            "suggestion": [how to fix this specific error]
          }
        ]
      }

      Responda sólo con JSON válido. No incluya ningún texto adicional.

      Sentence: "${text}"`;

      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.4,
        max_tokens: 500
      });

      const grammarResult = JSON.parse(response.choices[0].message.content);

      // Preparar la respuesta con valores predeterminados
      const grammarCheckResponse: GrammarCheckResponse = {
        correctedText: grammarResult.corrected,
        suggestions: [],
        errors: []
      };

      // Verificar si la oración ya es gramaticalmente correcta
      const isCorrect = grammarResult.explanation.includes("The sentence is already grammatically correct");
      // Asignar sugerencias basadas en disponibilidad de suggestion
      const hasSuggestion = grammarResult.suggestion && grammarResult.suggestion.trim() !== '';
      grammarCheckResponse.suggestions = hasSuggestion
        ? [grammarResult.explanation, grammarResult.suggestion]
        : [grammarResult.explanation, grammarResult.corrected];

      if (!isCorrect) {
        // Verificar si hay errores de tipo "grammar"
        const hasGrammarErrors = grammarResult.errors &&
          Array.isArray(grammarResult.errors) &&
          grammarResult.errors.some(error => error && error.type === 'grammar');

        if (hasGrammarErrors) {
          // Filtrar solo los errores de tipo "grammar"
          const grammarErrors = grammarResult.errors.filter(error =>
            error &&
            typeof error === 'object' &&
            typeof error.type === 'string' &&
            error.type === 'grammar' &&
            typeof error.message === 'string' &&
            typeof error.suggestion === 'string'
          );

          grammarCheckResponse.errors = grammarErrors;
          grammarCheckResponse.suggestions = [grammarCheckResponse.errors[0].message, grammarCheckResponse.errors[0].suggestion, grammarResult.corrected];

        } else {
          // Si no hay errores de tipo "grammar", procesar otros tipos de errores
          if (grammarResult.errors && Array.isArray(grammarResult.errors) && grammarResult.errors.length > 0) {
            // Validar y filtrar errores por tipo
            const validErrors = grammarResult.errors.filter(error =>
              error &&
              typeof error === 'object' &&
              typeof error.type === 'string' &&
              typeof error.message === 'string' &&
              typeof error.suggestion === 'string' &&
              ['vocabulary', 'spelling'].includes(error.type)
            );

            grammarCheckResponse.errors = validErrors;
          } else {
            // Si no hay errores específicos pero la explicación indica que hay correcciones
            grammarCheckResponse.errors = [{
              type: 'vocabulary',
              message: grammarResult.explanation,
              suggestion: grammarResult.corrected
            }];
          }

        }
      }

      return grammarCheckResponse;
    } catch (error) {
      console.error('Error checking grammar:', error);
      throw new Error('Could not check grammar');
    }
  }

  async generateConversation(
    context: string,
    difficulty: 'beginner' | 'intermediate' | 'advanced' = 'intermediate',
    conversationHistory: ConversationMessage[] = []
  ): Promise<{ conversation: Array<{ content: string }> }> {
    try {
      const messages: ConversationMessage[] = [
        {
          role: 'system',
          content: `You are a helpful English conversation partner. The conversation should be about: ${context}. 
          Adjust your language to ${difficulty} level. Keep responses concise and engaging.`
        },
        ...conversationHistory
      ];

      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: messages,
        temperature: 0.7,
        max_tokens: 150
      });

      return {
        conversation: [{ content: response.choices[0].message.content }]
      };
    } catch (error) {
      console.error('Error generating conversation:', error);
      throw new Error('Could not generate conversation');
    }
  }

  async generateSpanishConversation(
    context: string,
    conversationHistory: ConversationMessage[],
    difficulty: 'principiante' | 'intermedio' | 'avanzado' = 'intermedio'
  ): Promise<{ conversation: Array<{ content: string }> }> {
    try {
      // Crear un prompt específico según el contexto
      let systemPrompt = '';

      switch (context.toLowerCase()) {
        case 'entrevista':
          systemPrompt = `como entrevistador de trabajo de desarrollo de software y tutor de español.
          Hazme una pregunta cada vez, como si estuviéramos en una entrevista de trabajo real. Mantén el nivel de dificultad ${difficulty}.
          Después de que responda, hazme comentarios constructivos sobre mi español. Corrige cualquier error gramatical o de vocabulario y sugiere una forma más natural o profesional de decir lo que he intentado decir.
          A continuación, formula la siguiente pregunta de la entrevista. Continúa así la entrevista.`;
          break;

        case 'gramatica':
          systemPrompt = `como tutor de español amable y un entrevistador curioso.
          En cada turno, hazme una pregunta sobre cualquier tema que te interese (como mis pasatiempos, experiencias en viajes, experiencia en codificación, procesos de trabajo, opiniones o el mundo que nos rodea). 
          Mantén el nivel de dificultad ${difficulty}. Después de que responda, verifica mi gramática y estructura de la oración. Corrige cualquier error, explica la regla gramatical y sugiere una forma más clara o natural de decirlo. Luego formula la siguiente pregunta.`;
          break;

        case 'vocabulario':
          systemPrompt = `como tutor de español amable y un entrevistador curioso.
          En cada turno, hazme una pregunta sobre cualquier tema que te interese (como mis pasatiempos, experiencias en viajes, experiencia en codificación, procesos de trabajo, opiniones o el mundo que nos rodea). 
          Mantén el nivel de dificultad ${difficulty}. 
          Después de cada respuesta, da feedback sobre mi vocabulario: sugiere términos técnicos más precisos o exactos, explica su significado, 
          y ofrece expresiones o collocaciones relacionadas utilizadas en la industria del software. 
          Luego formula la siguiente pregunta.`;
          break;

        case 'pronunciacion':
          systemPrompt = `como entrevistador técnico en desarrollo de software amable y curioso, ayudándome a mejorar mi español hablado.
          Hazme una pregunta cada vez relacionada con la ingeniería de software o mi experiencia técnica (nivel ${difficulty}).
          Después de mi respuesta, da consejos de pronunciación—enfócate en las palabras técnicas comunes, corrige el tono y la articulación. 
          Muestra cómo pronunciar términos complicados fonéticamente o con palabras similares. Luego formula la siguiente pregunta.`;
          break;

        case 'negocios':
          systemPrompt = `como entrenador de español de negocios.
          Hazme una pregunta cada vez relacionada con la comunicación profesional en los negocios (ejemplos: entrevistas, reuniones, informes, trabajo remoto). 
          Mantén el nivel de dificultad ${difficulty}. 
          Después de cada respuesta, da feedback sobre el tono, la claridad y el vocabulario. 
          Corrige cualquier error gramatical o de fraseo y sugiere alternativas más naturales o profesionales. Luego formula la siguiente pregunta.`;
          break;

        default:
          systemPrompt = `como tutor de español y ingeniero de software ayudándome a practicar español en situaciones relacionadas con viajes.
          Hazme una pregunta cada vez que combina desarrollo de software y viajes—como asistir a conferencias técnicas, trabajar de forma remota en el extranjero, 
          comunicarse en aeropuertos, hoteles o en equipos internacionales. Mantén el nivel de dificultad ${difficulty}. 
          Después de cada una de mis respuestas, da feedback claro:
          – Corrige errores gramaticales
          – Sugerencia mejor vocabulario o expresiones
          – Da consejos de pronunciación si es necesario
          – Explica formas más naturales o profesionales de decir las cosas
          Luego formula la siguiente pregunta relacionada con viajes.`;
      }

      // Preparar los mensajes para la API
      const messages: ConversationMessage[] = [
        { role: 'system', content: systemPrompt },
        ...conversationHistory
      ];

      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: messages,
        temperature: 0.4,
        max_tokens: 1000
      });

      return {
        conversation: [
          { content: response.choices[0].message.content }
        ]
      };
    } catch (error) {
      console.error('Error generating conversation:', error);
      throw new Error('Could not generate conversation');
    }
  }

  async practiceSpeaking(
    topic: string,
    level: 'beginner' | 'intermediate' | 'advanced' = 'intermediate'
  ): Promise<string> {
    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: `You are an expert English conversation teacher. Generate speaking practice exercises about the specified topic with ${level} level.`
          },
          {
            role: 'user',
            content: `Generate speaking practice exercises in English about: ${topic}`
          }
        ],
        temperature: 0.7,
        max_tokens: 800
      });

      return response.choices[0].message.content;
    } catch (error) {
      console.error('Error generating speaking exercises:', error);
      throw new Error('Could not generate speaking exercises');
    }
  }

  async translateToEnglish(text: string, fromLanguage: string): Promise<string> {
    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: `You are an expert translator. Translate the text from ${fromLanguage} to English while maintaining the meaning and style.`
          },
          {
            role: 'user',
            content: `Translate this text to English: "${text}"`
          }
        ],
        temperature: 0.3,
        max_tokens: 500
      });

      return response.choices[0].message.content;
    } catch (error) {
      console.error('Error translating:', error);
      throw new Error('Could not translate the text');
    }
  }
} 