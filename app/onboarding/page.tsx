import OnboardingWizard from '@/components/features/onboarding/onboarding-wizard';

export default function OnboardingPage() {
  return (
    <div className="container mx-auto h-full py-10 max-w-lg flex flex-col">
      <div style={{ flex: 'none' }} className="mb-8">
        <h1 className="font-mono text-2xl font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
          $ clearance / setup
        </h1>
        <p className="font-mono text-sm" style={{ color: 'var(--text-secondary)' }}>
          connect github • select repos • start reviewing
        </p>
      </div>

      <div style={{ flex: 1, minHeight: 0 }}>
        <OnboardingWizard />
      </div>
    </div>
  );
}
