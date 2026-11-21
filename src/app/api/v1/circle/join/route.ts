import { circleFail, circleSession } from "@/lib/circle/http";
import { joinCircle } from "@/lib/circle/store";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      handle?: string;
      email?: string;
      displayName?: string;
      password?: string;
      role?: string;
      city?: string;
      focus?: string;
      bio?: string;
    };
    const viewer = await joinCircle({
      handle: String(body.handle ?? ""),
      email: String(body.email ?? ""),
      displayName: String(body.displayName ?? ""),
      password: String(body.password ?? ""),
      role: String(body.role ?? ""),
      city: body.city,
      focus: body.focus,
      bio: body.bio,
    });
    return circleSession(viewer);
  } catch (error) {
    return circleFail(error);
  }
}
