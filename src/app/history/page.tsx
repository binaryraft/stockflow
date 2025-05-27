import { PageTitle } from '@/components/common/page-title';
import { BillHistoryTable } from '@/components/history/bill-history-table';
import { History } from 'lucide-react';

export default function BillHistoryPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageTitle title="Bill History" icon={History} />
      <BillHistoryTable />
    </div>
  );
}
