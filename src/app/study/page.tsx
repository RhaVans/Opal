import { Suspense } from 'react';
import { StudyStudio } from '@/components/study/StudyStudio';

export default function StudyPage() {
  return (
    <Suspense
      fallback={
        <div className="rounded-[var(--radius-hero)] bg-white p-6 text-sm text-[#5B5B62] shadow-[var(--shadow-soft)]">
          Loading study session...
        </div>
      }
    >
      <StudyStudio />
    </Suspense>
  );
}
