// Test script para verificar la lógica de completePracticeSession
const { Types } = require('mongoose');

// Simular el DTO que viene del frontend
const mockDto = {
  language: 'english',
  level: 'B1', // El nivel que envía el frontend
  endedAt: new Date().toISOString(),
  durationSeconds: 300, // 5 minutos
  feedback: {
    pronunciation: { score: 85, mispronouncedWords: [] },
    grammar: { score: 78, errors: [] },
    vocabulary: { score: 82, rareWordsUsed: [], repeatedWords: [], suggestedWords: [] },
    fluency: { 
      score: 80, 
      wordsPerMinute: 120, 
      nativeRange: { min: 60, max: 90 },
      pausesPerMinute: 2,
      fillerWordsCount: 1,
      fillerWordsRatio: 0.01,
      mostUsedWords: []
    }
  }
};

// Simular cálculo de startedAt
function testStartedAtCalculation(endedAt, durationSeconds) {
  const endTime = new Date(endedAt);
  const durationMs = (durationSeconds || 0) * 1000;
  const startTime = new Date(endTime.getTime() - durationMs);
  
  // Validar la fecha calculada
  const validStartTime = isNaN(startTime.getTime()) || startTime.getTime() < 0 
    ? new Date(endTime.getTime() - 300000) // Default a 5 minutos antes
    : startTime;
  
  console.log('=== Test de cálculo de startedAt ===');
  console.log('endedAt:', endTime.toISOString());
  console.log('durationSeconds:', durationSeconds);
  console.log('startTime calculado:', startTime.toISOString());
  console.log('validStartTime final:', validStartTime.toISOString());
  console.log('Diferencia en segundos:', Math.round((endTime.getTime() - validStartTime.getTime()) / 1000));
  console.log('¿Es válida la fecha?', !isNaN(validStartTime.getTime()) && validStartTime.getTime() > 0);
  
  return validStartTime;
}

// Simular preservación de nivel
function testLevelPreservation(dtoLevel, sessionLevel, extractedLevel, analyzedLevel) {
  const originalLevel = dtoLevel || sessionLevel;
  const finalLevel = extractedLevel || analyzedLevel || originalLevel;
  
  console.log('\n=== Test de preservación de nivel ===');
  console.log('Nivel del DTO:', dtoLevel);
  console.log('Nivel de sesión existente:', sessionLevel);
  console.log('Nivel extraído de respuesta:', extractedLevel);
  console.log('Nivel analizado por IA:', analyzedLevel);
  console.log('Nivel original preservado:', originalLevel);
  console.log('Nivel final:', finalLevel);
  
  return finalLevel;
}

// Ejecutar tests
console.log('🧪 Ejecutando tests de lógica de completePracticeSession...\n');

// Test 1: Cálculo normal de fecha
testStartedAtCalculation(mockDto.endedAt, mockDto.durationSeconds);

// Test 2: Cálculo con duración 0
testStartedAtCalculation(mockDto.endedAt, 0);

// Test 3: Cálculo con duración undefined
testStartedAtCalculation(mockDto.endedAt, undefined);

// Test 4: Preservación de nivel del DTO
testLevelPreservation('B1', 'A1', null, null);

// Test 5: Nivel extraído tiene prioridad
testLevelPreservation('B1', 'A1', 'B2', 'A2');

// Test 6: Nivel analizado cuando no hay extraído
testLevelPreservation('B1', 'A1', null, 'A2');

console.log('\n✅ Tests completados');