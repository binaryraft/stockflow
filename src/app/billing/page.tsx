import { PageTitle } from '@/components/common/page-title';
import { BillingForm } from '@/components/billing/billing-form';
import { DollarSign } from 'lucide-react';
import { Suspense } from 'react';

// Helper component to ensure client components consuming searchParams are wrapped in Suspense
function BillingPageContent() {
  return <BillingForm />;
}

export default function BillingPage() {
  return (
    <div className="flex flex-col h-[calc(100vh-var(--header-height,60px)-2rem)]"> {/* Adjust var(--header-height) based on actual header height */}
      <PageTitle title="Billing" icon={DollarSign} />
      <Suspense fallback={<div>Loading billing options...</div>}>
        <BillingPageContent />
      </Suspense>
    </div>
  );
}
