import { redirect } from "next/navigation";
import { extractRoleFromUser, getRoleHomePath } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  redirect(getRoleHomePath(extractRoleFromUser(user)));
}
