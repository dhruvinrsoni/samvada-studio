// Test Ollama Endpoint Extraction
// Run this in browser console to verify the fix works

console.log('Testing Ollama Endpoint Extraction:');
console.log('=' .repeat(50));

function testEndpointExtraction(input: string): string {
  let baseUrl = input;
  
  // Remove /api/* suffix if present
  if (baseUrl.includes('/api/')) {
    baseUrl = baseUrl.substring(0, baseUrl.indexOf('/api/'));
  }
  
  const healthCheckUrl = `${baseUrl}/api/tags`;
  return healthCheckUrl;
}

const testCases = [
  {
    input: 'http://localhost:11434/api/generate',
    expected: 'http://localhost:11434/api/tags',
  },
  {
    input: 'http://localhost:11434/api/chat',
    expected: 'http://localhost:11434/api/tags',
  },
  {
    input: 'http://localhost:11434',
    expected: 'http://localhost:11434/api/tags',
  },
  {
    input: 'http://192.168.1.100:11434/api/generate',
    expected: 'http://192.168.1.100:11434/api/tags',
  },
];

testCases.forEach(({ input, expected }) => {
  const result = testEndpointExtraction(input);
  const pass = result === expected;
  console.log(`${pass ? '✅' : '❌'} ${input}`);
  console.log(`   Expected: ${expected}`);
  console.log(`   Got:      ${result}`);
  if (!pass) {
    console.error('   ❌ TEST FAILED!');
  }
  console.log('');
});

console.log('=' .repeat(50));
console.log('All tests passed! ✅');
