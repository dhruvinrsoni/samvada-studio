import { useState, useMemo } from 'react';
import { useChat } from '../../context/ChatContext';
import { generateId } from '../../utils/helpers';
import type { PromptTemplate } from '../../types';

const DEFAULT_TEMPLATES: Omit<PromptTemplate, 'id' | 'createdAt' | 'updatedAt'>[] = [
  { name: 'Code Review', description: 'Review code for bugs and improvements', content: 'Please review the following code for bugs, security issues, and potential improvements:\n\n```\n[paste code here]\n```', category: 'Development', tags: ['code', 'review'], isFavorite: false, usageCount: 0 },
  { name: 'Explain Like I\'m 5', description: 'Simple explanation of complex topics', content: 'Explain the following concept in simple terms that a 5-year-old could understand:\n\n[topic]', category: 'Learning', tags: ['explain', 'simple'], isFavorite: false, usageCount: 0 },
  { name: 'Summarize Text', description: 'Create a concise summary', content: 'Please summarize the following text in 3-5 bullet points, highlighting the key takeaways:\n\n[paste text here]', category: 'Writing', tags: ['summary', 'writing'], isFavorite: false, usageCount: 0 },
  { name: 'Debug Error', description: 'Help debug an error message', content: 'I\'m getting the following error. Please help me understand what\'s causing it and how to fix it:\n\nError:\n```\n[paste error here]\n```\n\nContext:\n[describe what you were doing]', category: 'Development', tags: ['debug', 'error'], isFavorite: false, usageCount: 0 },
  { name: 'Write Email', description: 'Draft a professional email', content: 'Write a professional email with the following details:\n\nTo: [recipient]\nPurpose: [what you want to achieve]\nTone: [formal/casual/friendly]\nKey points to include:\n- [point 1]\n- [point 2]', category: 'Writing', tags: ['email', 'professional'], isFavorite: false, usageCount: 0 },
  { name: 'Brainstorm Ideas', description: 'Generate creative ideas', content: 'I need creative ideas for [topic/project]. Please brainstorm 10 unique and innovative suggestions, considering:\n\n- Target audience: [who]\n- Constraints: [any limitations]\n- Goal: [what you want to achieve]', category: 'Creative', tags: ['brainstorm', 'ideas'], isFavorite: false, usageCount: 0 },
];

const CATEGORIES = ['All', 'Development', 'Writing', 'Learning', 'Creative', 'Custom'];

interface TemplatesLibraryProps {
  onSelectTemplate: (content: string) => void;
}

export default function TemplatesLibrary({ onSelectTemplate }: TemplatesLibraryProps) {
  const { state, dispatch } = useChat();
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<PromptTemplate | null>(null);
  const isDark = state.theme === 'dark';

  // Initialize with default templates if empty
  const templates = state.templates.length > 0 ? state.templates : DEFAULT_TEMPLATES.map(t => ({
    ...t,
    id: generateId(),
    createdAt: new Date(),
    updatedAt: new Date(),
  }));

  const filteredTemplates = useMemo(() => {
    return templates.filter(t => {
      const matchesCategory = selectedCategory === 'All' || t.category === selectedCategory;
      const matchesSearch = !searchQuery || 
        t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesCategory && matchesSearch;
    });
  }, [templates, selectedCategory, searchQuery]);

  const favoriteTemplates = templates.filter(t => t.isFavorite);

  const handleUseTemplate = (template: PromptTemplate) => {
    onSelectTemplate(template.content);
    dispatch({ type: 'INCREMENT_TEMPLATE_USAGE', payload: template.id });
    dispatch({ type: 'TOGGLE_TEMPLATES_MODAL' });
  };

  const handleSaveTemplate = (template: Omit<PromptTemplate, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (editingTemplate) {
      dispatch({
        type: 'UPDATE_TEMPLATE',
        payload: { ...editingTemplate, ...template, updatedAt: new Date() },
      });
    } else {
      dispatch({
        type: 'ADD_TEMPLATE',
        payload: {
          ...template,
          id: generateId(),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });
    }
    setIsCreating(false);
    setEditingTemplate(null);
  };

  if (!state.isTemplatesOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={() => dispatch({ type: 'TOGGLE_TEMPLATES_MODAL' })}
      />
      
      {/* Modal */}
      <div className={`relative w-full max-w-4xl max-h-[85vh] rounded-xl shadow-2xl border overflow-hidden flex flex-col ${
        isDark ? 'bg-dark-200 border-dark-300' : 'bg-white border-gray-200'
      }`}>
        {/* Header */}
        <div className={`flex items-center justify-between px-6 py-4 border-b flex-shrink-0 ${isDark ? 'border-dark-300' : 'border-gray-200'}`}>
          <h2 className={`text-xl font-semibold flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            📚 Prompt Templates
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsCreating(true)}
              className="px-3 py-1.5 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors"
            >
              + New Template
            </button>
            <button
              onClick={() => dispatch({ type: 'TOGGLE_TEMPLATES_MODAL' })}
              className={`p-2 rounded-lg transition-colors ${isDark ? 'hover:bg-dark-300 text-gray-400' : 'hover:bg-gray-100 text-gray-500'}`}
            >
              ✕
            </button>
          </div>
        </div>

        {isCreating || editingTemplate ? (
          <TemplateForm
            template={editingTemplate}
            onSave={handleSaveTemplate}
            onCancel={() => { setIsCreating(false); setEditingTemplate(null); }}
            isDark={isDark}
          />
        ) : (
          <>
            {/* Search and Categories */}
            <div className={`px-6 py-3 border-b flex-shrink-0 ${isDark ? 'border-dark-300' : 'border-gray-200'}`}>
              <div className="flex items-center gap-4">
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search templates..."
                    className={`w-full pl-10 pr-4 py-2 rounded-lg border ${
                      isDark ? 'bg-dark-300 border-dark-400 text-white placeholder-gray-500' : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400'
                    }`}
                  />
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
                </div>
                <div className="flex gap-1">
                  {CATEGORIES.map(cat => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                        selectedCategory === cat
                          ? 'bg-primary-600 text-white'
                          : isDark ? 'text-gray-400 hover:bg-dark-300' : 'text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Favorites Section */}
            {favoriteTemplates.length > 0 && selectedCategory === 'All' && !searchQuery && (
              <div className={`px-6 py-3 border-b ${isDark ? 'border-dark-300' : 'border-gray-200'}`}>
                <h3 className={`text-sm font-semibold mb-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>⭐ Favorites</h3>
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {favoriteTemplates.map(t => (
                    <button
                      key={t.id}
                      onClick={() => handleUseTemplate(t)}
                      className={`px-3 py-2 rounded-lg text-sm whitespace-nowrap ${isDark ? 'bg-dark-300 hover:bg-dark-400 text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-900'}`}
                    >
                      {t.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Templates Grid */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredTemplates.map(template => (
                  <div
                    key={template.id}
                    className={`p-4 rounded-xl border group ${isDark ? 'bg-dark-300 border-dark-400' : 'bg-gray-50 border-gray-200'}`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h4 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>{template.name}</h4>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => dispatch({ type: 'TOGGLE_TEMPLATE_FAVORITE', payload: template.id })}
                          className={`p-1 rounded ${isDark ? 'hover:bg-dark-400' : 'hover:bg-gray-200'}`}
                          title={template.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                        >
                          {template.isFavorite ? '⭐' : '☆'}
                        </button>
                        <button
                          onClick={() => setEditingTemplate(template)}
                          className={`p-1 rounded ${isDark ? 'hover:bg-dark-400' : 'hover:bg-gray-200'}`}
                          title="Edit template"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => dispatch({ type: 'DELETE_TEMPLATE', payload: template.id })}
                          className={`p-1 rounded ${isDark ? 'hover:bg-dark-400' : 'hover:bg-gray-200'}`}
                          title="Delete template"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                    <p className={`text-sm mb-3 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{template.description}</p>
                    <div className="flex items-center justify-between">
                      <div className="flex gap-1">
                        {template.tags.slice(0, 3).map(tag => (
                          <span key={tag} className={`px-2 py-0.5 rounded text-xs ${isDark ? 'bg-dark-400 text-gray-400' : 'bg-gray-200 text-gray-500'}`}>
                            {tag}
                          </span>
                        ))}
                      </div>
                      <button
                        onClick={() => handleUseTemplate(template)}
                        className="px-3 py-1.5 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors"
                      >
                        Use
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              {filteredTemplates.length === 0 && (
                <div className={`text-center py-12 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                  <div className="text-4xl mb-3">📭</div>
                  <p>No templates found</p>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

interface TemplateFormProps {
  template?: PromptTemplate | null;
  onSave: (template: Omit<PromptTemplate, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onCancel: () => void;
  isDark: boolean;
}

function TemplateForm({ template, onSave, onCancel, isDark }: TemplateFormProps) {
  const [name, setName] = useState(template?.name || '');
  const [description, setDescription] = useState(template?.description || '');
  const [content, setContent] = useState(template?.content || '');
  const [category, setCategory] = useState(template?.category || 'Custom');
  const [tags, setTags] = useState(template?.tags.join(', ') || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !content.trim()) return;
    onSave({
      name: name.trim(),
      description: description.trim(),
      content: content.trim(),
      category,
      tags: tags.split(',').map(t => t.trim()).filter(Boolean),
      isFavorite: template?.isFavorite || false,
      usageCount: template?.usageCount || 0,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
      <div>
        <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Template Name *</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., Code Review"
          className={`w-full px-4 py-2 rounded-lg border ${isDark ? 'bg-dark-300 border-dark-400 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
          required
        />
      </div>
      <div>
        <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Description</label>
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Brief description of what this template does"
          className={`w-full px-4 py-2 rounded-lg border ${isDark ? 'bg-dark-300 border-dark-400 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
        />
      </div>
      <div>
        <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Prompt Content *</label>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Enter your prompt template. Use [placeholders] for dynamic content."
          rows={6}
          className={`w-full px-4 py-2 rounded-lg border resize-none ${isDark ? 'bg-dark-300 border-dark-400 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
          required
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Category</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className={`w-full px-4 py-2 rounded-lg border ${isDark ? 'bg-dark-300 border-dark-400 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
          >
            {CATEGORIES.filter(c => c !== 'All').map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Tags</label>
          <input
            type="text"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="code, review, debug"
            className={`w-full px-4 py-2 rounded-lg border ${isDark ? 'bg-dark-300 border-dark-400 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
          />
        </div>
      </div>
      <div className="flex justify-end gap-3 pt-4">
        <button
          type="button"
          onClick={onCancel}
          className={`px-4 py-2 rounded-lg font-medium ${isDark ? 'text-gray-400 hover:bg-dark-300' : 'text-gray-600 hover:bg-gray-100'}`}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-4 py-2 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700"
        >
          {template ? 'Save Changes' : 'Create Template'}
        </button>
      </div>
    </form>
  );
}
