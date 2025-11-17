import { RegisterInput } from "@/schemas/register";

export async function registerUser(data: RegisterInput) {
  const res = await fetch("http://localhost:8000/register/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  const json = await res.json();

  if (!res.ok) {
    throw new Error(json.message || "Register failed");
  }

  return json;
}
