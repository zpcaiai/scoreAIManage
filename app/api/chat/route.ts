import { callKimi } from "@/lib/kimi";

export async function POST(req: Request) {
  const { messages } = await req.json();

  const reply = await callKimi(messages);

  return Response.json(reply);
}
