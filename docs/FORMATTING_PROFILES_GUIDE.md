# 💎 Formatting Profiles Guide

## Overview

**Formatting Profiles** provide per-chat custom instructions that control how AI responses are formatted. Each chat can have its own formatting rules, style preferences, and response format requirements.

## Feature Status: ✅ COMPLETE

This feature is now fully implemented with:
- ✅ 5 preset formatting profiles (Technical, Concise, Academic, Creative, Code-only)
- ✅ Custom profile creation
- ✅ Per-chat formatting rules (always include, always exclude, style guide)
- ✅ Response format control (Markdown, Code-only, Bullet-points, etc.)
- ✅ Integration with LLM prompts (automatic system prompt enhancement)
- ✅ Rule enable/disable toggles
- ✅ Profile persistence with chat settings

---

## 📚 What's a Formatting Profile?

A **Formatting Profile** is a collection of formatting rules that tell the AI how to structure and style its responses. Instead of manually adding "use bullet points" or "be concise" to every prompt, you set it once for the entire chat.

### Components of a Profile:

1. **Response Format** - How the response should be structured
   - Markdown (default)
   - Code Only
   - Bullet Points
   - Numbered List
   - Table Format

2. **Style Preferences** - Free-form instructions about writing style
   - Example: "Technical documentation style with code examples"
   - Example: "Warm, conversational tone with creative examples"

3. **Formatting Rules** - Specific instructions categorized by type:
   - **Response Format Rules**: Structural requirements
   - **Always Include**: Elements that must be present
   - **Always Exclude**: Elements to avoid
   - **Style Guide**: Writing conventions and preferences

---

## 🎨 Preset Profiles

### 1. Technical & Detailed
**Best for:** Code-heavy projects, technical documentation

**Characteristics:**
- Uses markdown code blocks with language specification
- Includes type signatures and error handling
- Covers edge cases
- Technical documentation style

**Example Use Cases:**
- API documentation
- Code reviews
- System architecture discussions
- Debugging sessions

### 2. Concise Bullets
**Best for:** Quick reference, scannable information

**Characteristics:**
- Everything in bullet points
- Maximum 3 sub-bullets per point
- Excludes long paragraphs
- Uses emojis for visual hierarchy

**Example Use Cases:**
- Meeting notes
- Quick tutorials
- Feature lists
- Action items

### 3. Academic & Formal
**Best for:** Research, formal writing, scholarly work

**Characteristics:**
- Formal structure: Introduction, Body, Conclusion
- Third person, no contractions
- Includes references and citations
- Formal vocabulary

**Example Use Cases:**
- Research papers
- Academic essays
- Formal reports
- Literature reviews

### 4. Creative & Conversational
**Best for:** Creative writing, brainstorming, friendly interactions

**Characteristics:**
- Uses contractions, idioms, metaphors
- Engaging and personable
- Includes examples, analogies, real-world applications
- Emojis when appropriate

**Example Use Cases:**
- Content creation
- Blog posts
- Social media content
- Brainstorming sessions

### 5. Code Only
**Best for:** When you just need working code, minimal explanation

**Characteristics:**
- Complete, runnable code
- Minimal text explanation
- Comments within code
- Excludes theoretical discussions

**Example Use Cases:**
- Quick code snippets
- Bug fixes
- Code refactoring
- Implementation requests

---

## 🛠️ How to Use Formatting Profiles

### Step 1: Open Chat Settings
1. Click on any chat in the sidebar
2. Click the "⚙️ Settings" button (or use keyboard shortcut)
3. Scroll to the "💎 Formatting Profile" section
4. Click the arrow to expand the section

### Step 2: Choose a Profile

**Option A: Use a Preset**
1. In the "Choose Preset" dropdown, select a profile
2. Review the profile details shown below
3. Preview the rules and formatting preferences
4. Click "Save Settings"

**Option B: Create Custom Profile**
1. Click "+ Create Custom Profile" button
2. A new custom profile will be created
3. Edit the profile name and description
4. Customize the settings (see Step 3)

### Step 3: Customize Your Profile (Custom Profiles Only)

#### Profile Settings:
- **Name**: Descriptive name for your profile
- **Description**: What this profile is for
- **Response Format**: Choose from dropdown
- **Style Preferences**: Free-form text describing your style

#### Adding Rules:
1. Click "+ Add Rule" button
2. For each rule, specify:
   - **Name**: Rule identifier
   - **Type**: Response Format / Always Include / Always Exclude / Style Guide
   - **Value**: Detailed instruction for this rule
3. Use the checkbox to enable/disable rules
4. Click "✕" to delete a rule

### Step 4: Save and Test
1. Click "Save Settings" at the bottom
2. Return to the chat
3. Send a test prompt
4. Observe how the AI formats its response according to your profile

---

## 📖 Example Workflows

### Workflow 1: Technical Code Review Chat

```
1. Create new chat: "Code Review - Feature X"
2. Open chat settings
3. Select "Technical & Detailed" profile
4. Add custom "Always Include": "security considerations, performance implications"
5. Add custom "Always Exclude": "basic explanations, generic advice"
6. Save
7. Prompt: "Review this authentication function"
8. Result: Technical response with code blocks, type hints, security notes
```

### Workflow 2: Quick Reference Chat

```
1. Create new chat: "Quick Commands"
2. Open chat settings
3. Select "Concise Bullets" profile
4. Save
5. Prompt: "How do I reset git changes?"
6. Result: Bullet-point response with commands, no long explanations
```

### Workflow 3: Research Paper Assistance

```
1. Create new chat: "Research - AI Ethics"
2. Open chat settings
3. Select "Academic & Formal" profile
4. Add "Always Include": "citations, peer-reviewed sources"
5. Save
6. Prompt: "Summarize current AI ethics debates"
7. Result: Formal academic summary with structure and references
```

### Workflow 4: Custom Profile for API Documentation

```
1. Create new chat: "API Docs Generator"
2. Open chat settings
3. Click "Create Custom Profile"
4. Set name: "API Documentation Style"
5. Set response format: "Markdown"
6. Add Rule 1:
   - Type: Response Format
   - Name: "API Structure"
   - Value: "Always include: Endpoint, Method, Parameters, Request Body, Response, Example"
7. Add Rule 2:
   - Type: Always Include
   - Name: "Code Examples"
   - Value: "cURL example, JavaScript fetch example, Python requests example"
8. Add Rule 3:
   - Type: Style Guide
   - Name: "Documentation Style"
   - Value: "Use OpenAPI 3.0 conventions. Include status codes. Add authentication notes."
9. Set style preferences: "Professional technical documentation with comprehensive examples"
10. Save
11. Prompt: "Document the /users/create endpoint"
12. Result: Structured API documentation following your exact specifications
```

---

## 🎯 Best Practices

### 1. **Match Profile to Purpose**
- Technical chats → Technical profile
- Quick questions → Concise profile
- Formal writing → Academic profile

### 2. **Use Custom Profiles for Specialized Tasks**
- API documentation
- Code generation for specific frameworks
- Consistent brand voice for content creation

### 3. **Combine with Context Panels**
- Use Context Panels for persistent data (API keys, project details)
- Use Formatting Profiles for style and structure
- Together = powerful customization

### 4. **Test Your Profile**
- After creating a custom profile, test with various prompts
- Refine rules based on actual output
- Disable rules that don't improve responses

### 5. **Different Profiles for Different Chats**
- Technical chat: Use "Technical & Detailed"
- Brainstorming chat: Use "Creative & Conversational"
- Quick tasks: Use "Concise Bullets"

---

## 🔧 Technical Details

### How It Works

1. **Profile Storage**: Formatting profiles are stored per-chat in `chat.settings.formattingProfile`
2. **System Prompt Enhancement**: When sending a prompt, the profile rules are injected into the system prompt
3. **LLM Processing**: The LLM receives the enhanced prompt and follows the formatting instructions
4. **Consistency**: All responses in that chat will follow the same formatting rules

### System Prompt Structure

When you select a profile, the system automatically builds this structure:

```
[Base System Prompt]

You are a [role from chat settings].

[Custom Instructions]

## FORMATTING REQUIREMENTS
Profile: [Profile Name]
Response Format: [Format Type]

Style: [Style Preferences]

Formatting Rules:
1. [RESPONSE-FORMAT] Rule Name: Rule Value
2. [ALWAYS-INCLUDE] Rule Name: Rule Value
3. [ALWAYS-EXCLUDE] Rule Name: Rule Value
...

Always Include: [comma-separated list]
Always Exclude: [comma-separated list]

## EXAMPLES
Example 1:
Input: [example input]
Output: [example output]
```

### Data Structure

```typescript
interface FormattingProfile {
  id: string;
  name: string;
  description: string;
  isCustom: boolean;
  rules: FormattingRule[];
  responseFormat?: string;
  stylePreferences?: string;
}

interface FormattingRule {
  id: string;
  type: 'response-format' | 'always-include' | 'always-exclude' | 'style-guide';
  name: string;
  description: string;
  value: string;
  isEnabled: boolean;
}
```

---

## 🧪 Manual Testing Guide

### Test 1: Preset Profile Application

**Steps:**
1. Create a new chat
2. Open chat settings
3. Expand "Formatting Profile" section
4. Select "Concise Bullets" preset
5. Save settings
6. Send prompt: "Explain how photosynthesis works"

**Expected Result:**
- Response formatted as bullet points
- No long paragraphs
- Maximum 3 sub-bullets per point
- Concise explanations

**Pass Criteria:**
- ✅ Response uses bullet points
- ✅ Information is concise
- ✅ Structure matches profile description

### Test 2: Custom Profile Creation

**Steps:**
1. Create a new chat
2. Open chat settings
3. Click "Create Custom Profile"
4. Edit profile:
   - Name: "Test Profile"
   - Description: "Testing custom formatting"
   - Response Format: "Code Only"
   - Style Preferences: "Only provide code, minimal comments"
5. Add rule:
   - Type: "Always Exclude"
   - Name: "No Explanations"
   - Value: "Do not include explanations, theory, or background"
6. Enable the rule
7. Save settings
8. Send prompt: "Create a function to sort an array"

**Expected Result:**
- Response contains only code
- Minimal or no explanatory text
- Code is complete and runnable

**Pass Criteria:**
- ✅ Custom profile saved successfully
- ✅ Profile appears in chat settings
- ✅ Response follows custom rules

### Test 3: Profile Persistence

**Steps:**
1. Create chat with "Technical & Detailed" profile
2. Send a prompt and get response
3. Close Samvada Studio
4. Reopen Samvada Studio
5. Open the same chat
6. Open chat settings
7. Check if profile is still selected

**Expected Result:**
- Profile persists across sessions
- Settings remain intact

**Pass Criteria:**
- ✅ Profile still selected after restart
- ✅ All profile settings preserved

### Test 4: Rule Enable/Disable

**Steps:**
1. Open a chat with a preset profile (e.g., "Academic & Formal")
2. Open chat settings
3. Disable one of the rules
4. Save settings
5. Send prompt: "Write about climate change"
6. Re-enable the rule
7. Save settings
8. Send same prompt again

**Expected Result:**
- First response doesn't follow disabled rule
- Second response follows all rules

**Pass Criteria:**
- ✅ Disabling rule affects output
- ✅ Re-enabling rule restores behavior

### Test 5: Multiple Chats, Different Profiles

**Steps:**
1. Create Chat A with "Code Only" profile
2. Create Chat B with "Creative & Conversational" profile
3. In Chat A, prompt: "Create a hello world function"
4. In Chat B, prompt: "Create a hello world function"
5. Compare responses

**Expected Result:**
- Chat A: Code only, minimal text
- Chat B: Friendly explanation with code and analogies

**Pass Criteria:**
- ✅ Each chat maintains its own profile
- ✅ Responses differ based on profile
- ✅ No cross-contamination between chats

---

## 🐛 Troubleshooting

### Issue: Profile not applying
**Solution:**
- Ensure you clicked "Save Settings"
- Check if rules are enabled (checkbox)
- Verify LLM provider is configured

### Issue: Custom profile lost
**Solution:**
- Check browser console for storage errors
- Ensure localStorage is not full
- Try exporting/importing chat data

### Issue: Rules conflict with each other
**Solution:**
- Review all enabled rules
- Disable conflicting rules
- Prioritize most important rules

---

## 🚀 Future Enhancements

Potential additions to this feature:
- [ ] Profile templates marketplace
- [ ] Import/export profiles
- [ ] Profile inheritance (base profile + overrides)
- [ ] AI-suggested profiles based on chat content
- [ ] Profile analytics (which profiles work best)

---

## 📝 Summary

Formatting Profiles give you fine-grained control over AI response formatting:

✅ **5 Presets** covering common use cases
✅ **Custom Profiles** for specialized needs
✅ **Per-Chat Settings** for context-specific formatting
✅ **Rule Categories** for organized formatting control
✅ **Enable/Disable** rules on the fly
✅ **Persistent** across sessions

**Result:** Consistent, professional, and tailored AI responses for every use case.

---

Built with ❤️ for Samvada Studio
