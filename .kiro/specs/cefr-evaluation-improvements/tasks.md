# Implementation Plan: CEFR Evaluation Improvements

## Overview

Este plan implementa las mejoras al sistema de evaluación CEFR de manera incremental, comenzando con los componentes de análisis de texto, luego integrando con el sistema realtime, y finalmente agregando las capacidades avanzadas de análisis. Cada tarea construye sobre las anteriores para asegurar funcionalidad progresiva.

## Tasks

- [x] 1. Implementar extractor de nivel CEFR y filtro de audio
  - Crear servicio para extraer niveles CEFR de texto de respuestas
  - Implementar filtro de audio para respuestas de evaluación
  - Integrar con el servicio realtime existente
  - _Requirements: 1.1, 1.2, 1.4, 1.5, 5.1, 5.2, 5.4_

- [ ]* 1.1 Escribir pruebas de propiedad para extracción de CEFR
  - **Property 1: CEFR Level Extraction and Audio Filtering**
  - **Validates: Requirements 1.1, 1.2, 1.5, 5.1, 5.2, 5.4**

- [ ]* 1.2 Escribir pruebas de propiedad para asignación de nivel fallback
  - **Property 2: Fallback Level Assignment**
  - **Validates: Requirements 1.4**

- [x] 2. Implementar detector de muletillas y analizador de frecuencia de palabras
  - Crear servicio de detección de muletillas para inglés y español
  - Implementar análisis de frecuencia de palabras en transcripts
  - Integrar con el análisis de fluidez existente
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [ ]* 2.1 Escribir pruebas de propiedad para detección de muletillas
  - **Property 5: Filler Word Detection Accuracy**
  - **Validates: Requirements 3.1, 3.2, 3.5**

- [ ]* 2.2 Escribir pruebas de propiedad para análisis de frecuencia de palabras
  - **Property 6: Word Frequency Analysis**
  - **Validates: Requirements 3.3, 3.4**

- [-] 3. Crear analizador IPA y mejorar feedback de pronunciación
  - Implementar diccionarios IPA para inglés y español
  - Crear servicio de análisis de pronunciación con IPA
  - Mejorar estructura de feedback de pronunciación
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [ ]* 3.1 Escribir pruebas de propiedad para notación IPA
  - **Property 3: IPA Notation Completeness**
  - **Validates: Requirements 2.2, 2.4, 2.5**

- [ ]* 3.2 Escribir pruebas de propiedad para seguimiento de errores de pronunciación
  - **Property 4: Pronunciation Error Tracking**
  - **Validates: Requirements 2.1, 2.3**

- [ ] 4. Implementar mejorador de vocabulario y sugerencias avanzadas
  - Crear clasificador de complejidad de palabras por nivel CEFR
  - Implementar generador de sugerencias de vocabulario avanzado
  - Integrar con análisis de vocabulario existente
  - _Requirements: 4.1, 4.2, 4.3, 4.5_

- [ ]* 4.1 Escribir pruebas de propiedad para clasificación de vocabulario
  - **Property 7: Vocabulary Classification and Enhancement**
  - **Validates: Requirements 4.1, 4.2, 4.5**

- [ ]* 4.2 Escribir pruebas de propiedad para sugerencias contextuales
  - **Property 8: Context-Appropriate Suggestions**
  - **Validates: Requirements 4.3**

- [ ] 5. Checkpoint - Verificar componentes individuales
  - Asegurar que todas las pruebas pasen, preguntar al usuario si surgen dudas.

- [ ] 6. Integrar filtro de audio con servicio realtime
  - Modificar OpenAI Realtime Service para usar el filtro de audio
  - Implementar detección de respuestas de evaluación en tiempo real
  - Asegurar funcionamiento en ambos modos (práctica y test)
  - _Requirements: 5.3, 5.5_

- [ ]* 6.1 Escribir pruebas de propiedad para filtrado de audio cross-mode
  - **Property 9: Cross-Mode Audio Filtering**
  - **Validates: Requirements 5.3, 5.5**

- [ ] 7. Mejorar servicio de análisis CEFR con nuevos componentes
  - Integrar detector de muletillas en análisis de fluidez
  - Integrar analizador IPA en análisis de pronunciación
  - Integrar mejorador de vocabulario en análisis de vocabulario
  - Actualizar prompts de análisis para incluir nuevas capacidades
  - _Requirements: 6.1, 6.2, 6.3, 6.4_

- [ ]* 7.1 Escribir pruebas de propiedad para integración realtime-nonrealtime
  - **Property 10: Realtime-NonRealtime Integration**
  - **Validates: Requirements 6.1, 6.2, 6.3, 6.4**

- [ ] 8. Actualizar DTOs y estructuras de datos
  - Extender CompletePracticeSessionDto con nuevos campos opcionales
  - Actualizar interfaces de feedback para incluir nuevos datos
  - Asegurar compatibilidad hacia atrás con APIs existentes
  - _Requirements: 7.1, 7.2, 7.3, 7.5_

- [ ]* 8.1 Escribir pruebas de propiedad para compatibilidad hacia atrás
  - **Property 11: Backward Compatibility Preservation**
  - **Validates: Requirements 7.1, 7.2, 7.3, 7.5**

- [ ] 9. Implementar manejo robusto de errores y fallbacks
  - Agregar manejo de errores para todos los nuevos componentes
  - Implementar fallbacks apropiados para cada tipo de análisis
  - Agregar logging y métricas para monitoreo
  - _Requirements: 7.4_

- [ ]* 9.1 Escribir pruebas de propiedad para robustez de manejo de errores
  - **Property 12: Error Handling Robustness**
  - **Validates: Requirements 7.4**

- [ ] 10. Integración final y pruebas end-to-end
  - Conectar todos los componentes en el flujo completo
  - Probar flujo completo: realtime → extracción → análisis → feedback
  - Verificar que el nivel CEFR extraído se asigne correctamente
  - Validar que las evaluaciones finales no reproduzcan audio
  - _Requirements: All_

- [ ]* 10.1 Escribir pruebas de integración end-to-end
  - Probar flujo completo con sesiones simuladas
  - Validar extracción de CEFR en contexto real
  - Verificar supresión de audio en evaluaciones finales

- [ ] 11. Checkpoint final - Asegurar que todas las pruebas pasen
  - Asegurar que todas las pruebas pasen, preguntar al usuario si surgen dudas.

## Notes

- Las tareas marcadas con `*` son opcionales y pueden omitirse para un MVP más rápido
- Cada tarea referencia requerimientos específicos para trazabilidad
- Los checkpoints aseguran validación incremental
- Las pruebas de propiedades validan propiedades de corrección universales
- Las pruebas unitarias validan ejemplos específicos y casos edge
- La implementación mantiene compatibilidad completa con el sistema existente