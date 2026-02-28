import { redirect } from "next/navigation";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function Home() {
  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll() {},
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: membership } = await supabaseAdmin
    .from("memberships")
    .select("role, org_id")
    .eq("user_id", user.id)
    .single();

  if (!membership) {
    redirect("/waiting");
  }

  if (membership.role === "platform_admin") {
    redirect("/admin");
  }

  // For org members, redirect to their client dashboard
  const { data: org } = await supabaseAdmin
    .from("organizations")
    .select("slug")
    .eq("id", membership.org_id)
    .single();

  if (org?.slug) {
    redirect(`/client/${org.slug}`);
  }

  redirect("/login");
}
