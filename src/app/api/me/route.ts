import { authenticate } from "@/lib/auth";
import { jsonOk } from "@/lib/api";

export async function GET(req: Request) {
  const auth = await authenticate(req.headers);
  return jsonOk({ isAdmin: auth.ok });
}
