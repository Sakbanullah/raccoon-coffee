import { redirect } from "next/navigation";

export default function LegacyPhotosRedirect() {
  redirect("/admin/raccoon-wall");
}
