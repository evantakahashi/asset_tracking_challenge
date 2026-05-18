import { redirect } from "next/navigation";

export default function ReconcileRedirect(): never {
  redirect("/manager");
}
