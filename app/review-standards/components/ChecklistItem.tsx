'use client';

import { useState, useRef, useEffect } from 'react';
import { ChecklistItem as ChecklistItemType } from '@/lib/features/review-standards/review-standards';

interface ChecklistItemProps {
  item: ChecklistItemType;
  isEditMode: boolean;
  onRemove: (itemId: string) => void;
  onEdit: (itemId: string, newText: string) => void;
}

export default function ChecklistItem({ item, isEditMode, onRemove, onEdit }: ChecklistItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(item.text);
  const inputRef = useRef<HTMLInputElement>(null);

  // Update editText when item.text changes (from external edits)
  useEffect(() => {
    if (!isEditing) {
      setEditText(item.text);
    }
  }, [item.text, isEditing]);

  const handleStartEdit = () => {
    if (isEditMode) {
      setEditText(item.text);
      setIsEditing(true);
    }
  };

  const handleSaveEdit = () => {
    if (editText.trim() && editText !== item.text) {
      onEdit(item.id, editText.trim());
    }
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditText(item.text);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveEdit();
    } else if (e.key === 'Escape') {
      handleCancelEdit();
    }
  };

  return (
    <div className="flex items-start gap-2 py-1">
      <span className="font-mono text-sm select-none" style={{ color: 'var(--text-secondary)' }}>
        [ ]
      </span>
      {isEditing ? (
        <input
          ref={inputRef}
          type="text"
          value={editText}
          onChange={(e) => setEditText(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleCancelEdit}
          className="flex-1 px-2 py-0.5 font-mono text-sm border rounded"
          style={{
            backgroundColor: 'var(--surface-base)',
            borderColor: 'var(--border-standard)',
            color: 'var(--text-primary)',
          }}
          autoFocus
        />
      ) : (
        <span
          className={`font-mono text-sm flex-1 ${isEditMode ? 'cursor-text hover:underline' : ''}`}
          style={{ color: 'var(--text-secondary)' }}
          onClick={handleStartEdit}
        >
          {item.text}
        </span>
      )}
      {isEditMode && !isEditing && (
        <button
          onClick={() => onRemove(item.id)}
          className="font-mono text-xs px-1 hover:bg-surface-raised transition-colors rounded"
          style={{ color: 'var(--text-tertiary)' }}
          title="Remove item"
        >
          ×
        </button>
      )}
    </div>
  );
}
