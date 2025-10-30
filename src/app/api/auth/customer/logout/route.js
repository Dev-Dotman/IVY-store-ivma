import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import { deleteSession } from "@/lib/auth";

export async function POST(req) {
  try {
    await connectToDatabase();
    
    const cookies = parseCookies(req.headers.get('cookie') || '');
    const sessionId = cookies.session;

    if (sessionId) {
      await deleteSession(sessionId);
    }

    const response = NextResponse.json(
      { success: true, message: "Logged out successfully" },
      { status: 200 }
    );

    // Clear session cookie
    response.headers.set(
      'Set-Cookie',
      'session=; HttpOnly; Path=/; Max-Age=0; SameSite=Strict'
    );

    return response;
  } catch (error) {
    console.error("Logout error:", error);
    return NextResponse.json(
      { success: false, message: "Logout failed" },
      { status: 500 }
    );
  }
}

function parseCookies(cookieHeader) {
  const cookies = {};
  if (cookieHeader) {
    cookieHeader.split(';').forEach(cookie => {
      const [name, value] = cookie.trim().split('=');
      if (name && value) {
        cookies[name] = decodeURIComponent(value);
      }
    });
  }
  return cookies;
}
