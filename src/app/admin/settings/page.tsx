
import { PageTitle } from '@/components/common/page-title';
import { Settings as SettingsIcon } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function SettingsPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageTitle title="Application Settings" icon={SettingsIcon} />
      <Card className="shadow-md border-t-2 border-t-primary">
        <CardHeader>
          <CardTitle>Settings Overview</CardTitle>
          <CardDescription>
            This section will house application-wide settings. Currently, it's a placeholder.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Future settings could include:
          </p>
          <ul className="list-disc list-inside mt-2 text-sm text-muted-foreground space-y-1">
            <li>Default currency and number formatting preferences.</li>
            <li>Date and time zone settings.</li>
            <li>Notification preferences (e.g., low stock alerts, bill reminders).</li>
            <li>Data import/export options and backup management.</li>
            <li>User interface preferences (e.g., default theme if not system, table density).</li>
            <li>Tax configuration and default tax rates.</li>
            <li>Integration settings for third-party services (e.g., accounting software, payment gateways).</li>
            <li>Company profile details (address, contact info, logo for bills).</li>
            <li>Security settings (e.g., two-factor authentication, session timeouts).</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
