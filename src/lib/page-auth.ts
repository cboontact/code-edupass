import { headers } from "next/headers";
import { authenticate, type AuthResult } from "./auth";

export async function getPageAuth(): Promise<AuthResult> {
  return authenticate(await headers());
}
