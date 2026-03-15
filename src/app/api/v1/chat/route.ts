import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { prompt, systemInstruction } = await req.json();
    const apiKey = process.env.APIFREELLM_API_KEY;

    if (!apiKey) {
      console.error("APIFREELLM_API_KEY is missing in process.env");
      return NextResponse.json({ success: false, error: "APIFREELLM_API_KEY is not configured" }, { status: 500 });
    }

    console.log(`Sending request to APIFreeLLM... Model: gpt-4o-mini`);

    const messages = [];
    if (systemInstruction) {
      messages.push({ role: "system", content: systemInstruction });
    }
    messages.push({ role: "user", content: prompt });

    const response = await fetch("https://apifreellm.com/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "gpt-4o-mini", // Or whatever model APIFreeLLM uses
        messages: messages
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`APIFreeLLM API error: ${response.status} ${errorText}`);
      return NextResponse.json({ success: false, error: `APIFreeLLM API error: ${response.status} ${errorText}` }, { status: response.status });
    }

    const data = await response.json();
    
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      console.error("Unexpected API response format:", JSON.stringify(data));
      return NextResponse.json({ success: false, error: "Unexpected API response format" }, { status: 500 });
    }

    return NextResponse.json({ success: true, text: data.choices[0].message.content });
  } catch (error) {
    console.error("Error in /api/v1/chat:", error);
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 });
  }
}
