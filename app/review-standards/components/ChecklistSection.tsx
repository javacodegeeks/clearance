'use client';

import { useState } from 'react';
import { ChecklistCategory, TechStack } from '@/lib/features/review-standards/review-standards';
import ChecklistItem from './ChecklistItem';

interface ChecklistSectionProps {
  techStack: TechStack;
  category: ChecklistCategory;
  isCollapsed: boolean;
  isEditMode: boolean;
  onToggleCollapse: () => void;
  onRemoveItem: (categoryId: string, itemId: string) => void;
  onAddItem: (categoryId: string, itemText: string) => void;
  onEditItem: (itemId: string, newText: string) => void;
}

export default function ChecklistSection({
  techStack,
  category,
  isCollapsed,
  isEditMode,
  onToggleCollapse,
  onRemoveItem,
  onAddItem,
  onEditItem,
}: ChecklistSectionProps) {
  const [newItemText, setNewItemText] = useState('');
  const [isAddingItem, setIsAddingItem] = useState(false);

  const handleAddItem = () => {
    if (newItemText.trim()) {
      onAddItem(category.id, newItemText.trim());
      setNewItemText('');
      setIsAddingItem(false);
    }
  };

  return (
    <div
      className="border rounded mb-4"
      style={{
        borderColor: 'var(--border-standard)',
      }}
    >
      {/* Section Header */}
      <button
        onClick={onToggleCollapse}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-surface-raised transition-colors"
      >
        <span
          className="font-mono text-xs font-semibold"
          style={{ color: 'var(--text-primary)' }}
        >
          {isCollapsed ? '▸' : '▾'} {category.name.toLowerCase()} ({category.items.length})
        </span>
      </button>

      {/* Section Content */}
      {!isCollapsed && (
        <div
          className="px-4 pb-4 border-t"
          style={{ borderColor: 'var(--border-subtle)' }}
        >
          <div className="pt-2 space-y-1">
            {category.items.map((item) => (
              <ChecklistItem
                key={item.id}
                item={item}
                isEditMode={isEditMode}
                onRemove={(itemId) => onRemoveItem(category.id, itemId)}
                onEdit={onEditItem}
              />
            ))}
          </div>

          {/* Add Item in Edit Mode */}
          {isEditMode && (
            <div className="mt-3 pt-3 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
              {!isAddingItem ? (
                <button
                  onClick={() => setIsAddingItem(true)}
                  className="font-mono text-xs px-2 py-1 border rounded hover:bg-surface-raised transition-colors"
                  style={{
                    borderColor: 'var(--border-standard)',
                    color: 'var(--text-secondary)',
                  }}
                >
                  + item
                </button>
              ) : (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newItemText}
                    onChange={(e) => setNewItemText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleAddItem();
                      } else if (e.key === 'Escape') {
                        setNewItemText('');
                        setIsAddingItem(false);
                      }
                    }}
                    placeholder="checklist:"
                    className="flex-1 px-2 py-1 font-mono text-sm border rounded"
                    style={{
                      backgroundColor: 'var(--surface-base)',
                      borderColor: 'var(--border-standard)',
                      color: 'var(--text-primary)',
                    }}
                    autoFocus
                  />
                  <button
                    onClick={handleAddItem}
                    className="font-mono text-xs px-2 py-1 border rounded hover:bg-surface-raised transition-colors"
                    style={{
                      borderColor: 'var(--border-standard)',
                      color: 'var(--text-secondary)',
                    }}
                  >
                    add
                  </button>
                  <button
                    onClick={() => {
                      setNewItemText('');
                      setIsAddingItem(false);
                    }}
                    className="font-mono text-xs px-2 py-1 border rounded hover:bg-surface-raised transition-colors"
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
      )}
    </div>
  );
}
