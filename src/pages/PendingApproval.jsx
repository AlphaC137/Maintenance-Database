import { Clock, LogOut, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/AuthContext";

export default function PendingApproval() {
  const { logout } = useAuth();

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-background">
      <div className="w-full max-w-md px-6 py-12 text-center">
        {/* Animated icon */}
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-amber-500/10 ring-4 ring-amber-500/20">
          <Clock className="h-10 w-10 animate-pulse text-amber-500" />
        </div>

        <div className="mb-2 flex items-center justify-center gap-2">
          <ShieldCheck className="h-5 w-5 text-primary" />
          <span className="text-xs font-semibold uppercase tracking-widest text-primary">
            CCTV Maintenance Platform
          </span>
        </div>

        <h1 className="mb-3 font-display text-2xl font-bold tracking-tight">
          Account Pending Approval
        </h1>
        <p className="mb-2 text-sm text-muted-foreground leading-relaxed">
          Your registration has been received. Your account is currently being
          reviewed by the system administrator.
        </p>
        <p className="mb-8 text-sm text-muted-foreground leading-relaxed">
          Once approved, you'll be able to log in with your credentials.
          If you haven't heard back, contact{" "}
          <a
            href="mailto:slebeloane@stallion.co.za"
            className="font-medium text-primary hover:underline"
          >
            slebeloane@stallion.co.za
          </a>
          .
        </p>

        <div className="rounded-xl border border-border bg-card p-4 text-left text-sm mb-8">
          <p className="font-medium mb-1">What happens next?</p>
          <ol className="space-y-1.5 text-muted-foreground list-decimal list-inside">
            <li>The administrator reviews your registration</li>
            <li>Your role is assigned (Administrator, Maintenance, or Read Only)</li>
            <li>You receive access and can log in normally</li>
          </ol>
        </div>

        <Button
          variant="outline"
          className="w-full"
          onClick={() => logout()}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Sign out
        </Button>
      </div>
    </div>
  );
}
