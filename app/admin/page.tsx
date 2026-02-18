import Link from "next/link";

export default function AdminDashboard() {
  return (
    <div>
      <h2 className="font-serif text-2xl font-bold mb-6">Admin Dashboard</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link
          href="/admin/prompt"
          className="rounded-lg border border-foreground/10 p-6 hover:border-accent/50 transition-colors"
        >
          <h3 className="font-serif text-lg font-bold mb-2">Edit Prompt</h3>
          <p className="text-sm text-foreground/50">
            Edit the AI system prompt that controls how Socratic tutors students.
          </p>
        </Link>
        <Link
          href="/admin/documents"
          className="rounded-lg border border-foreground/10 p-6 hover:border-accent/50 transition-colors"
        >
          <h3 className="font-serif text-lg font-bold mb-2">Documents</h3>
          <p className="text-sm text-foreground/50">
            Upload syllabus PDFs and notes to the knowledge base.
          </p>
        </Link>
        <Link
          href="/admin/conversations"
          className="rounded-lg border border-foreground/10 p-6 hover:border-accent/50 transition-colors"
        >
          <h3 className="font-serif text-lg font-bold mb-2">Conversations</h3>
          <p className="text-sm text-foreground/50">
            View all student conversations and monitor progress.
          </p>
        </Link>
      </div>
    </div>
  );
}
