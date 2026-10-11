import { ShieldAlert } from "lucide-react";
import { useAdminPermissions } from "@/hooks/useAdminPermissions";

/**
 * Adnan, recap A19: hiding the nav link isn't enough — a Sales Rep (or a
 * scoped-down admin like Raya) must also be blocked if they navigate to the
 * URL directly. Wrap a page's content with this, inside its DashboardLayout.
 */
const AdminPermissionGate = ({ permission, children }: { permission: string; children: React.ReactNode }) => {
  const permissions = useAdminPermissions();
  if (permissions === null) return null;
  if (!permissions.has(permission)) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center text-muted-foreground">
        <ShieldAlert className="w-10 h-10 mb-3 opacity-50" />
        <p className="font-medium text-foreground">You don't have access to this page</p>
        <p className="text-sm mt-1">Ask an admin with Manage Users access to grant it.</p>
      </div>
    );
  }
  return <>{children}</>;
};

export default AdminPermissionGate;
