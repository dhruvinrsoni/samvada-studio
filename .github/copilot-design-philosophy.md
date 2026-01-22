# Future-Proof Design - Copilot Instructions

> **MISSION**: Guide developers to write code that lasts, adapts, and maintains clarity for years.

---

## 🎯 Core Mandates

When generating or reviewing code, Copilot MUST enforce:

1. **Standardization**: Follow existing patterns, don't invent new ones
2. **Defensive Design**: Handle all failure modes explicitly
3. **Separation of Concerns**: One responsibility per module
4. **Convention Over Configuration**: Use established patterns
5. **Explicit Over Implicit**: Clear intent, no magic

---

## 📏 Pattern Enforcement

### 1. **Standardized Interfaces**

```typescript
// ❌ REJECT: Custom implementation per type
function handleOpenAI() { /* unique logic */ }
function handleAnthropic() { /* different logic */ }

// ✅ REQUIRE: Follow the template
interface Provider {
  call(prompt: string): Promise<Response>;
  fetchModels(key: string): Promise<Model[]>;
  test(config: Config): Promise<TestResult>;
}

// Each provider = fill the template
```

**Copilot Action**: When user adds new feature:
1. **SEARCH**: Find similar existing implementations
2. **EXTRACT**: Identify the pattern
3. **APPLY**: Generate code following same pattern
4. **FLAG**: If pattern doesn't exist, suggest creating one

---

### 2. **Defensive Error Handling**

```typescript
// ❌ REJECT: Optimistic, no error handling
const data = await fetch(url).then(r => r.json());
setState(data.result);

// ✅ REQUIRE: Comprehensive error handling
try {
  const response = await fetch(url);
  
  // Check HTTP status
  if (!response.ok) {
    if (response.status === 401) throw new AuthError();
    if (response.status === 404) throw new NotFoundError();
    if (response.status === 429) throw new RateLimitError();
    if (response.status >= 500) throw new ServerError();
    throw new UnknownError(response.status);
  }
  
  // Validate structure
  const data = await response.json();
  if (!data || !data.result) {
    throw new ValidationError('Invalid response');
  }
  
  // Sanitize before use
  setState(sanitize(data.result));
  
} catch (error) {
  // Log with context
  logError('API call failed', error, { url, context });
  
  // Graceful fallback
  setState(fallbackValue);
  showUserMessage('Operation failed. Please try again.');
}
```

**Copilot Auto-Add**:
- Status code checking
- Response validation
- Error logging
- User-friendly messages
- Fallback values

---

### 3. **Proper Separation**

```typescript
// ✅ LAYER 1: API Communication (utils/)
export async function callAPI(endpoint: string) {
  // ONLY HTTP, parsing, auth
  // NO business logic
  // NO UI concerns
}

// ✅ LAYER 2: Business Logic (context/)
export function useFeature() {
  // ONLY state management
  // Coordinates API + UI
  // NO direct API calls
  // NO rendering
}

// ✅ LAYER 3: UI (components/)
export function Component() {
  // ONLY rendering, events
  // NO API calls
  // NO complex logic
}
```

**Copilot Guidance**:
- **API code in utils/?** Suggest adding to appropriate service file
- **Business logic in component?** Suggest extracting to context/hook
- **UI logic in utility?** Flag and request reorganization

---

### 4. **Convention Adherence**

**File Placement Rules**:
```
src/
├── components/          # UI only
│   ├── admin/          # Feature grouping
│   ├── chat/
│   └── common/         # Shared across features
├── context/            # State management
├── hooks/              # Custom hooks
├── types/              # TypeScript definitions
├── utils/              # Pure functions, services
└── constants/          # Config, literals
```

**Copilot Enforcement**:
```
User creates: src/utils/ChatButton.tsx
Copilot: "❌ ChatButton is a component.
Correct path: src/components/chat/ChatButton.tsx
Auto-move? [Yes] [No]"
```

---

### 5. **Explicit Type Definitions**

```typescript
// ❌ REJECT: Implicit, unclear
function update(data: any) { }
function process(input) { } // No type

// ✅ REQUIRE: Explicit, documented
/**
 * Updates provider configuration
 * @param config - Complete provider config with all fields
 * @throws {ValidationError} If config is invalid
 */
function updateProvider(config: LLMProviderConfig): void {
  // TypeScript enforces correctness
}
```

**Copilot Auto-Add**:
- Type annotations for all parameters
- Return type annotations
- JSDoc comments for public APIs
- @throws, @example, @see tags

---

## 🔮 Future-Proofing Patterns

### Pattern 1: Versioned Data Structures

```typescript
// ✅ ALWAYS version persistent data
interface AppStateV1 {
  version: 1;
  // ... fields
}

interface AppStateV2 {
  version: 2;
  // ... fields + new features
}

// Migration logic
function migrate(data: unknown): AppState {
  const versioned = data as { version: number };
  
  if (versioned.version === 1) {
    return migrateV1ToV2(versioned);
  }
  
  return versioned as AppStateV2;
}
```

**Copilot Auto-Add**:
- `version` field to any persisted interface
- Migration function skeleton
- Backward compatibility check

---

### Pattern 2: Extension Points

```typescript
// ✅ Design for future additions
interface PromptResponse {
  id: string;
  prompt: Message;
  responses: Message[];
  
  // Extension point: Add data without breaking changes
  metadata?: Record<string, unknown>;
  
  // Extension point: Plugin system
  plugins?: {
    onRender?: (pnr: PromptResponse) => React.ReactNode;
    onSave?: (pnr: PromptResponse) => PromptResponse;
  };
}
```

**Copilot Suggestion**:
```
Copilot: "💡 I added a metadata field for future extensibility.
This allows adding features (tags, categories, etc.) without breaking changes."
```

---

### Pattern 3: Graceful Degradation

```typescript
// ✅ Always have fallbacks
async function getModels(provider: Provider): Promise<string[]> {
  try {
    // Try best option
    const result = await fetchFromAPI(provider);
    if (result.success) return result.models;
  } catch (error) {
    logWarning('API fetch failed, using defaults', error);
  }
  
  // Fallback to defaults
  return DEFAULT_MODELS[provider.type];
}
```

**Copilot Auto-Add**:
- Try/catch around external calls
- Fallback value
- Logging of degradation
- User notification (if needed)

---

### Pattern 4: Progressive Enhancement

```typescript
// ✅ Base functionality + optional enhancements
function FeatureComponent() {
  const hasEnhancement = checkCapability();
  
  return (
    <>
      {/* Base: Always works */}
      <BaseFeature />
      
      {/* Enhancement: Bonus if available */}
      {hasEnhancement && <EnhancedFeature />}
    </>
  );
}
```

**Copilot Pattern**:
- Core feature first (no dependencies)
- Check capability before enhancement
- Degrade gracefully if unavailable

---

## 🛠️ Proactive Maintenance

### Code Health Checks

**On Save**:
- [ ] No functions > 20 lines (suggest split)
- [ ] No 'any' types (require explicit)
- [ ] All exports have JSDoc
- [ ] No magic numbers (use constants)

**On Commit**:
- [ ] All tests passing
- [ ] No TypeScript errors
- [ ] No ESLint warnings
- [ ] Imports organized

**Quarterly**:
- [ ] Dependency updates available?
- [ ] Dead code detected?
- [ ] New patterns emerged?
- [ ] Documentation current?

---

## 📚 Documentation Requirements

### Required for Every Public API

```typescript
/**
 * Brief one-line description.
 * 
 * Detailed explanation of what this does, when to use it,
 * and any important gotchas or considerations.
 * 
 * @param name - Description of parameter
 * @param config - Description with type info if complex
 * @returns Description of return value
 * @throws {ErrorType} When and why this error occurs
 * 
 * @example
 * ```ts
 * const result = await someFunction('test', { opt: true });
 * if (result.success) {
 *   console.log(result.data);
 * }
 * ```
 * 
 * @see {@link RelatedFunction} for similar functionality
 * @see {@link DOCUMENTATION.md#section} for more details
 */
export async function someFunction(
  name: string,
  config: Config
): Promise<Result>
```

**Copilot Auto-Generate**:
- Extract parameter names/types
- Generate example from usage
- Link to related functions
- Add common tags (@throws, @deprecated, etc.)

---

## 🚨 Anti-Pattern Detection

### Detect and Flag

**1. God Functions**
```typescript
// ❌ DETECTED: Function too long (>30 lines)
function doEverything() {
  // 100 lines of code
}

// Copilot: "⚠️ This function is too complex.
// Suggest splitting into:
// - validateInput()
// - processData()
// - handleErrors()
// - formatOutput()"
```

**2. Tight Coupling**
```typescript
// ❌ DETECTED: Direct dependency on implementation
import { OpenAIService } from './openai';
function chat() {
  const api = new OpenAIService(); // Tightly coupled
}

// Copilot: "⚠️ Direct coupling to OpenAI.
// Suggest using interface:
// - Define LLMProvider interface
// - Inject via dependency
// - Swap implementations easily"
```

**3. Magic Values**
```typescript
// ❌ DETECTED: Magic number
if (input.length > 4096) { }

// Copilot: "⚠️ Magic number detected.
// Suggest:
// const MAX_INPUT_LENGTH = 4096;
// if (input.length > MAX_INPUT_LENGTH) { }"
```

**4. Missing Error Handling**
```typescript
// ❌ DETECTED: Unhandled promise
const data = await riskyOperation();

// Copilot: "⚠️ No error handling.
// Auto-wrapping in try/catch...
// [Wrapped]"
```

---

## 💡 Proactive Suggestions

### Context-Aware Guidance

**When adding similar code**:
```
User: Creates 3rd function with same pattern

Copilot: "💡 I notice a pattern emerging.
Would you like me to:
1. Extract shared logic to utility function
2. Create a generic implementation
3. Document this as a standard pattern

This will:
✅ Reduce duplication
✅ Ease future maintenance
✅ Establish project convention"
```

**When violating pattern**:
```
User: Adds API call in component

Copilot: "⚠️ API calls should be in utils/services.
Project convention: Separation of concerns
- API in utils/
- Logic in context/
- UI in components/

Refactor to follow pattern? [Yes] [Show Me How]"
```

**When introducing breaking change**:
```
User: Changes interface signature

Copilot: "🔴 Breaking change detected!
This interface is used in 7 places:
- ChatArea.tsx (3 usages)
- ProviderForm.tsx (2 usages)
- AdminPanel.tsx (2 usages)

Suggestions:
1. Add new field as optional (backward compatible)
2. Version interface (AppStateV2)
3. Deprecate and migrate (add TODO)

Which approach?"
```

---

## 🎓 Teaching Mode

**Explain Why, Not Just What**

```
User: Why does this need a try/catch?

Copilot: "🎓 Error handling here is important because:

1. **External dependency**: This calls an API that might:
   - Be down (network error)
   - Return errors (400/500 status)
   - Timeout (slow response)

2. **User experience**: Without try/catch:
   - App crashes (white screen)
   - User sees stack trace (scary)
   - Data might be lost

3. **Debugging**: With error handling:
   - Errors are logged with context
   - Users see friendly message
   - Fallback value prevents crash

4. **Future-proofing**: API might change
   - Response format changes
   - New error codes added
   - Defensive design adapts

See docs/FUTURE_PROOF_DESIGN.md#defensive-design"
```

---

## 🔍 Code Review Checklist

**Before accepting PR, verify**:

### Structure
- [ ] Files in correct directories (convention)
- [ ] One concern per module (separation)
- [ ] Follows existing patterns (standardization)

### Code Quality
- [ ] Functions < 20 lines (complexity)
- [ ] No 'any' types (explicitness)
- [ ] All branches covered (defensive)

### Documentation
- [ ] Public APIs documented (JSDoc)
- [ ] Complex logic explained (comments)
- [ ] README updated if needed

### Testing
- [ ] New code has tests
- [ ] Edge cases covered
- [ ] Error paths tested

### Future-Proofing
- [ ] Extension points present
- [ ] Graceful degradation
- [ ] Versioned if persisted

---

## 🌟 Success Indicators

**Copilot knows it's working when**:

✅ **Code generated matches existing patterns**
- New provider implementation = 20 min
- Uses same template as others
- No custom special cases

✅ **Developers thank Copilot for catching issues**
- "Good catch on that error handling!"
- "Thanks for the separation reminder"
- "Didn't realize I was coupling too tightly"

✅ **Codebase stays consistent**
- All API calls look similar
- Error handling is uniform
- File organization is predictable

✅ **Documentation stays current**
- Generated JSDoc matches code
- Examples are accurate
- Links are valid

---

## 🎯 Mission Reminder

**Copilot's job is to**:
1. **Guide** toward established patterns
2. **Prevent** anti-patterns and pitfalls
3. **Teach** why, not just what
4. **Maintain** code health proactively
5. **Future-proof** by design, not accident

**Success = Code written today makes sense in 5 years**

---

## 📖 Reference Documentation

- [FUTURE_PROOF_DESIGN.md](../docs/FUTURE_PROOF_DESIGN.md) - Full philosophy
- [LLM_PROVIDERS.md](../docs/LLM_PROVIDERS.md) - Pattern example
- [CONTRIBUTING.md](../CONTRIBUTING.md) - Code standards
- [copilot-instructions.md](./copilot-instructions.md) - Project specifics

---

**Last Updated**: January 22, 2026  
**Enforcement Level**: Strong guidance (not blocking)  
**Review Frequency**: Quarterly, evolve with project

> *"The code you write today is read far more often than it's written. Make it count."*  
> *— Copilot's guiding principle*
