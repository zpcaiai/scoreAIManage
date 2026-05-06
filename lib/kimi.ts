export async function callKimi(messages: any[]) {
  const res = await fetch("https://api.moonshot.cn/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.KIMI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "moonshot-v1-128k",
      messages,
      temperature: 0.7,
    }),
  });

  const data = await res.json();
  return data.choices[0].message;
}
