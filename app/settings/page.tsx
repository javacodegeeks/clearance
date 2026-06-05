import { SettingsForm } from '@/components/features/settings';

export default function SettingsPage() {
  return (
    <div className="container mx-auto h-full py-6 max-w-2xl flex flex-col">
      {/* Fixed Header */}
      <div style={{ flex: 'none' }}>
        <h1 className="font-mono text-2xl font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
          $ settings
        </h1>
        <p className="mb-4 font-mono text-sm" style={{ color: 'var(--text-secondary)' }}>
          credentials • repos • preferences • code governance
        </p>
      </div>

      {/* Scrollable Form */}
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
        <SettingsForm />
      </div>
    </div>
  );
}
