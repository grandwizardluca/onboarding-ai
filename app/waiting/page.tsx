export default function WaitingPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4 bg-background">
      <div className="w-full max-w-sm text-center space-y-4">
        <div className="text-4xl">⏳</div>
        <h1 className="text-xl font-semibold text-foreground">You're in the queue</h1>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Your account has been created, but you haven't been assigned to an organization yet.
          An admin will set up your access shortly.
        </p>
        <p className="text-xs text-muted-foreground">
          If you think this is a mistake, contact your administrator.
        </p>
      </div>
    </div>
  );
}
