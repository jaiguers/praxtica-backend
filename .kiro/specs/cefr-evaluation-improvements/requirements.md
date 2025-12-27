# Requirements Document

## Introduction

Mejoras al sistema de evaluación CEFR para el modelo realtime voice, incluyendo extracción automática del nivel CEFR, análisis detallado de pronunciación con IPA, detección de muletillas, y sugerencias de vocabulario avanzado.

## Glossary

- **CEFR_Evaluator**: Sistema que analiza conversaciones y determina el nivel CEFR del usuario
- **Realtime_Voice_Model**: Modelo de OpenAI que maneja conversaciones de voz en tiempo real
- **IPA_Analyzer**: Componente que proporciona notación fonética internacional para palabras mal pronunciadas
- **Filler_Word_Detector**: Sistema que identifica y cuenta muletillas en el habla del usuario
- **Vocabulary_Enhancer**: Componente que sugiere sinónimos y palabras avanzadas
- **Audio_Response_Filter**: Sistema que previene que la evaluación final se reproduzca por audio

## Requirements

### Requirement 1: Extracción Automática de Nivel CEFR

**User Story:** Como sistema de evaluación, quiero extraer automáticamente el nivel CEFR de la respuesta de la IA, para que se asigne correctamente al campo level del feedback.

#### Acceptance Criteria

1. WHEN la IA responde con una evaluación final THEN el sistema SHALL extraer el nivel CEFR (A1, A2, B1, B2, C1, C2) de la respuesta
2. WHEN se extrae un nivel CEFR válido THEN el sistema SHALL asignarlo al campo level del feedback
3. WHEN la respuesta contiene texto como "I believe you have a B1 level" THEN el sistema SHALL extraer "B1" correctamente
4. WHEN no se puede extraer un nivel válido THEN el sistema SHALL usar un nivel por defecto basado en el análisis previo
5. WHEN la evaluación final es generada THEN el sistema SHALL marcarla como texto-solamente (sin audio)

### Requirement 2: Análisis Detallado de Pronunciación

**User Story:** Como evaluador de pronunciación, quiero identificar palabras mal pronunciadas con notación IPA, para proporcionar feedback específico y técnico.

#### Acceptance Criteria

1. WHEN se analiza la pronunciación del usuario THEN el sistema SHALL identificar palabras específicas mal pronunciadas
2. WHEN se identifica una palabra mal pronunciada THEN el sistema SHALL proporcionar la notación IPA correcta
3. WHEN se detecta una mala pronunciación THEN el sistema SHALL registrar el número de intentos y timestamp
4. WHEN se evalúa pronunciación THEN el sistema SHALL incluir notas específicas sobre dificultades fonéticas
5. THE IPA_Analyzer SHALL proporcionar notación fonética precisa para palabras en inglés y español

### Requirement 3: Detección de Muletillas y Análisis de Frecuencia

**User Story:** Como analizador de fluidez, quiero detectar muletillas y palabras frecuentes en el habla del usuario, para evaluar la naturalidad del discurso.

#### Acceptance Criteria

1. WHEN se analiza la fluidez del usuario THEN el sistema SHALL contar las muletillas utilizadas
2. WHEN se procesa el transcript THEN el sistema SHALL identificar palabras de relleno como "um", "uh", "like", "you know"
3. WHEN se evalúa frecuencia de palabras THEN el sistema SHALL identificar las palabras más utilizadas por el usuario
4. WHEN se detectan muletillas excesivas THEN el sistema SHALL reducir la puntuación de fluidez proporcionalmente
5. THE Filler_Word_Detector SHALL funcionar tanto para inglés como español

### Requirement 4: Sugerencias de Vocabulario Avanzado

**User Story:** Como mejorador de vocabulario, quiero sugerir sinónimos y palabras avanzadas, para ayudar al usuario a expandir su vocabulario.

#### Acceptance Criteria

1. WHEN se evalúa el vocabulario del usuario THEN el sistema SHALL identificar palabras básicas utilizadas
2. WHEN se detectan palabras básicas THEN el sistema SHALL sugerir alternativas más avanzadas
3. WHEN se proporcionan sugerencias THEN el sistema SHALL incluir sinónimos apropiados para el nivel del usuario
4. WHEN se sugieren palabras avanzadas THEN el sistema SHALL considerar el contexto de la conversación
5. THE Vocabulary_Enhancer SHALL proporcionar sugerencias graduales según el nivel CEFR del usuario

### Requirement 5: Control de Respuesta de Audio

**User Story:** Como controlador de audio, quiero prevenir que la evaluación final se reproduzca por audio, para que el usuario no escuche la evaluación después de finalizar la conversación.

#### Acceptance Criteria

1. WHEN la IA genera una evaluación final con nivel CEFR THEN el sistema SHALL marcarla como solo-texto
2. WHEN se detecta una respuesta de evaluación final THEN el Audio_Response_Filter SHALL prevenir la reproducción de audio
3. WHEN la conversación ha terminado THEN el sistema SHALL procesar la evaluación sin enviar audio al usuario
4. WHEN se identifica el patrón de evaluación final THEN el sistema SHALL extraer el nivel y suprimir el audio
5. THE Audio_Response_Filter SHALL funcionar tanto en modo práctica como en modo test

### Requirement 6: Integración con Modelo No-Realtime

**User Story:** Como sistema de evaluación completa, quiero utilizar el modelo no-realtime para análisis detallado, para proporcionar evaluaciones más precisas después de la sesión realtime.

#### Acceptance Criteria

1. WHEN finaliza una sesión realtime THEN el sistema SHALL enviar el transcript completo al modelo no-realtime
2. WHEN el modelo no-realtime procesa el transcript THEN el sistema SHALL generar análisis detallado de pronunciación, fluidez y vocabulario
3. WHEN se completa el análisis no-realtime THEN el sistema SHALL combinar los resultados con la evaluación realtime
4. WHEN se integran ambos análisis THEN el sistema SHALL proporcionar un feedback comprehensivo final
5. THE CEFR_Evaluator SHALL coordinar entre ambos modelos para máxima precisión

### Requirement 7: Preservación de Funcionalidad Existente

**User Story:** Como mantenedor del sistema, quiero preservar toda la funcionalidad existente, para que las mejoras no rompan el comportamiento actual.

#### Acceptance Criteria

1. WHEN se implementan las mejoras THEN el sistema SHALL mantener toda la funcionalidad de evaluación existente
2. WHEN se procesan sesiones de práctica THEN el sistema SHALL seguir funcionando con el flujo actual
3. WHEN se generan reportes THEN el sistema SHALL incluir tanto datos existentes como nuevos campos mejorados
4. WHEN se manejan errores THEN el sistema SHALL mantener la robustez actual con fallbacks apropiados
5. THE sistema SHALL ser compatible con todas las interfaces y DTOs existentes