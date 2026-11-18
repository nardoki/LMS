import { redirect } from "next/navigation";
import { extractRoleFromUser, getRoleHomePath } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      redirect(getRoleHomePath(extractRoleFromUser(user)));
    }
  } catch (error: any) {
    if (error?.digest?.startsWith?.("NEXT_REDIRECT")) {
      throw error;
    }
    console.error("HomePage auth check error:", error);
  }

  redirect("/login");
}
