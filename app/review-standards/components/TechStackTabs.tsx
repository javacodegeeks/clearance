'use client';

import { TechStack, getTechStackLabel } from '@/lib/features/review-standards/review-standards';

interface TechStackTabsProps {
  techStacks: TechStack[];
  activeTechStack: TechStack;
  onTabChange: (techStack: TechStack) => void;
}

export default function TechStackTabs({
  techStacks,
  activeTechStack,
  onTabChange,
}: TechStackTabsProps) {
  return (
    <div className="flex gap-6 mb-6 border-b" style={{ borderColor: 'var(--border-standard)' }}>
      {techStacks.map((techStack) => {
        const isActive = techStack === activeTechStack;
        const label = getTechStackLabel(techStack);
        return (
          <button
            key={techStack}
            onClick={() => onTabChange(techStack)}
            className="font-mono text-sm font-semibold pb-3 relative transition-colors"
            style={{
              color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
            }}
          >
            {isActive ? `[${label.toLowerCase()}]` : label.toLowerCase()}
            {isActive && (
              <div
                className="absolute bottom-0 left-0 right-0 h-0.5"
                style={{ backgroundColor: 'var(--text-primary)' }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
