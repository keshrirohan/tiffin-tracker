import { getServerSession } from "next-auth";
import { authOptions } from "./auth";
import { NextResponse } from "next/server";

/**
 * Gets the current user's session. Returns userId string or a 401 NextResponse.
 */
export async function requireAuth(): Promise<
  { userId: string; error?: never } | { userId?: never; error: NextResponse }
> {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return {
      error: NextResponse.json(
        { success: false, error: "You must be logged in." },
        { status: 401 }
      ),
    };
  }

  return { userId: session.user.id };
}
