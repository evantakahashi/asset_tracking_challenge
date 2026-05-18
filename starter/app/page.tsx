import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export default async function HomePage(): Promise<never> {
  const role = (await cookies()).get("asset-challenge-role")?.value;
  if (role === "tech") redirect("/tech");
  redirect("/manager");
}
