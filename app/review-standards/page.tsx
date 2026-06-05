'use client';

import { useState, useEffect } from 'react';
import {
  TechStack,
  getChecklistForTechStack,
  addCustomItem,
  removeCustomItem,
  addCustomCategory,
  editItem,
  toggleSectionCollapse,
  isSectionCollapsed,
} from '@/lib/features/review-standards/review-standards';
import TechStackTabs from './components/TechStackTabs';
import ChecklistSection from './components/ChecklistSection';

const TECH_STACKS: TechStack[] = ['ai', 'csharp', 'java', 'javascript', 'python', 'react', 'springboot', 'typescript'];

export default function ReviewStandardsPage() {
  const [activeTechStack, setActiveTechStack] = useState<TechStack>('ai');
  const [isEditMode, setIsEditMode] = useState(false);
  const [checklist, setChecklist] = useState(() => {
    const list = getChecklistForTechStack('ai');
    return [...list].sort((a, b) => a.name.localeCompare(b.name));
  });
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  // Reload checklist when tech stack or edit mode changes
  useEffect(() => {
    const list = getChecklistForTechStack(activeTechStack);
    // Sort sections alphabetically by name
    const sorted = [...list].sort((a, b) => a.name.localeCompare(b.name));
    setChecklist(sorted);
  }, [activeTechStack, isEditMode]);

  const handleTabChange = (techStack: TechStack) => {
    setActiveTechStack(techStack);
    setIsEditMode(false);
    setIsAddingCategory(false);
  };

  const handleToggleEditMode = () => {
    setIsEditMode(!isEditMode);
    setIsAddingCategory(false);
  };

  const handleRemoveItem = (categoryId: string, itemId: string) => {
    removeCustomItem(activeTechStack, categoryId, itemId);
    const list = getChecklistForTechStack(activeTechStack);
    setChecklist([...list].sort((a, b) => a.name.localeCompare(b.name)));
  };

  const handleAddItem = (categoryId: string, itemText: string) => {
    addCustomItem(activeTechStack, categoryId, itemText);
    const list = getChecklistForTechStack(activeTechStack);
    setChecklist([...list].sort((a, b) => a.name.localeCompare(b.name)));
  };

  const handleEditItem = (itemId: string, newText: string) => {
    editItem(activeTechStack, itemId, newText);
    const list = getChecklistForTechStack(activeTechStack);
    setChecklist([...list].sort((a, b) => a.name.localeCompare(b.name)));
  };

  const handleToggleCollapse = (categoryId: string) => {
    toggleSectionCollapse(activeTechStack, categoryId);
    // Force re-render by updating checklist
    const list = getChecklistForTechStack(activeTechStack);
    setChecklist([...list].sort((a, b) => a.name.localeCompare(b.name)));
  };

  const handleAddCategory = () => {
    if (newCategoryName.trim()) {
      addCustomCategory(activeTechStack, newCategoryName.trim());
      setNewCategoryName('');
      setIsAddingCategory(false);
      const list = getChecklistForTechStack(activeTechStack);
      setChecklist([...list].sort((a, b) => a.name.localeCompare(b.name)));
    }
  };

  return (
    <div className="container mx-auto h-full overflow-y-auto py-8 px-6 max-w-4xl">
      {/* Header */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1
            className="font-mono text-2xl font-semibold mb-2"
            style={{ color: 'var(--text-primary)' }}
          >
            $ review-standards
          </h1>
          <p className="font-mono text-sm" style={{ color: 'var(--text-secondary)' }}>
            tech stack checklists • edit to customize
          </p>
        </div>
        <button
          onClick={handleToggleEditMode}
          className="font-mono text-xs px-3 py-2 border rounded hover:bg-surface-raised transition-colors"
          style={{
            borderColor: 'var(--border-standard)',
            color: isEditMode ? 'var(--text-primary)' : 'var(--text-secondary)',
            backgroundColor: isEditMode ? 'var(--surface-raised)' : 'transparent',
          }}
        >
          {isEditMode ? '[view]' : '[edit]'}
        </button>
      </div>

      {/* Tech Stack Tabs */}
      <TechStackTabs
        techStacks={TECH_STACKS}
        activeTechStack={activeTechStack}
        onTabChange={handleTabChange}
      />

      {/* Checklist Sections */}
      <div>
        {checklist.map((category) => (
          <ChecklistSection
            key={category.id}
            techStack={activeTechStack}
            category={category}
            isCollapsed={isSectionCollapsed(activeTechStack, category.id)}
            isEditMode={isEditMode}
            onToggleCollapse={() => handleToggleCollapse(category.id)}
            onRemoveItem={handleRemoveItem}
            onAddItem={handleAddItem}
            onEditItem={handleEditItem}
          />
        ))}
      </div>

      {/* Add Custom Section (Edit Mode) */}
      {isEditMode && (
        <div className="mt-4">
          {!isAddingCategory ? (
            <button
              onClick={() => setIsAddingCategory(true)}
              className="font-mono text-xs px-3 py-2 border rounded hover:bg-surface-raised transition-colors"
              style={{
                borderColor: 'var(--border-standard)',
                color: 'var(--text-secondary)',
              }}
            >
              + section
            </button>
          ) : (
            <div className="flex gap-2">
              <input
                type="text"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleAddCategory();
                  } else if (e.key === 'Escape') {
                    setNewCategoryName('');
                    setIsAddingCategory(false);
                  }
                }}
                placeholder="section:"
                className="flex-1 px-3 py-2 font-mono text-sm border rounded"
                style={{
                  backgroundColor: 'var(--surface-base)',
                  borderColor: 'var(--border-standard)',
                  color: 'var(--text-primary)',
                }}
                autoFocus
              />
              <button
                onClick={handleAddCategory}
                className="font-mono text-xs px-3 py-2 border rounded hover:bg-surface-raised transition-colors"
                style={{
                  borderColor: 'var(--border-standard)',
                  color: 'var(--text-secondary)',
                }}
              >
                add
              </button>
              <button
                onClick={() => {
                  setNewCategoryName('');
                  setIsAddingCategory(false);
                }}
                className="font-mono text-xs px-3 py-2 border rounded hover:bg-surface-raised transition-colors"
                style={{
                  borderColor: 'var(--border-standard)',
                  color: 'var(--text-tertiary)',
                }}
              >
                cancel
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
