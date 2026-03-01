// ── AI via OpenRouter (Gemini Pro) ──────────────────────────────────────────
// Set VITE_OPENROUTER_API_KEY in your .env file at the project root.
// OpenRouter supports CORS so this works from the browser.

const OPENROUTER_API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY;
const MODEL = "google/gemini-2.0-flash-001";
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

async function chat(messages, json = false) {
  // Guard: catch missing API key early with a clear message
  if (!OPENROUTER_API_KEY) {
    throw new Error(
      "Missing VITE_OPENROUTER_API_KEY. Add it to your .env file and restart the dev server."
    );
  }

  const body = {
    model: MODEL,
    messages,
    ...(json ? { response_format: { type: "json_object" } } : {}),
  };

  console.debug("[AI] Sending request to OpenRouter:", { model: MODEL, messageCount: messages.length });

  let res;
  try {
    res = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": window.location.origin,
        "X-Title": "Food Waste Monitor",
      },
      body: JSON.stringify(body),
    });
  } catch (networkErr) {
    console.error("[AI] Network error (possible CORS or offline):", networkErr);
    throw new Error(`Network error: ${networkErr.message}`);
  }

  if (!res.ok) {
    let errBody = {};
    try { errBody = await res.json(); } catch (_) {}
    console.error("[AI] OpenRouter error response:", res.status, errBody);
    throw new Error(errBody.error?.message ?? `OpenRouter error ${res.status}`);
  }

  const data = await res.json();
  const text = data.choices?.[0]?.message?.content ?? "";
  console.debug("[AI] Response received:", text.slice(0, 120));

  if (json) {
    // Strip markdown code fences that some models add even when asked not to
    const clean = text.replace(/```json\s*/gi, "").replace(/```/g, "").trim();
    try {
      return JSON.parse(clean);
    } catch (parseErr) {
      console.error("[AI] JSON parse failed. Raw text was:", text);
      throw new Error("AI returned invalid JSON. See console for raw response.");
    }
  }

  return text;
}

// ── Pie chart: classify waste items into food categories ──────────────────────
// Returns: Array<{ label, pct, color }>
export async function classifyWasteCategories(topWasted) {
  const itemList = topWasted
    .map((i) => `${i.name}: ${i.count} occurrences, ${i.avg}% avg waste`)
    .join("\n");

  const result = await chat(
    [
      {
        role: "system",
        content: `You are a food waste analyst. Given a list of wasted food items, classify them into 3-5 broad food categories and estimate what percentage of total waste each category represents. The percentages must sum to 100. Respond ONLY with a valid JSON object — no markdown, no explanation:
{"categories": [{"label": "Grains", "pct": 35}, {"label": "Vegetables", "pct": 25}]}`,
      },
      {
        role: "user",
        content: `Classify these wasted items into food categories:\n${itemList}`,
      },
    ],
    true
  );

  const colors = ["#51904e", "#93c16d", "#fbbf24", "#ef4444", "#3b82f6"];
  return result.categories.map((c, i) => ({ ...c, color: colors[i % colors.length] }));
}

// ── Recommendations: generate 3 actionable insights from data ─────────────────
// Returns: Array<{ type, text, color }>
export async function generateRecommendations(reportData) {
  const summary = `
Top wasted items: ${reportData.topWasted.map((i) => `${i.name} (${i.avg}% waste, ${i.count} occurrences)`).join(", ")}
Weekly trend: ${reportData.bar.map((b) => `${b.day}: ${b.pct}%`).join(", ")}
Best meal: ${reportData.stats.bestMeal}
Total waste: ${reportData.stats.totalWasteKg}kg out of ${reportData.stats.totalFoodKg}kg processed
  `.trim();

  const result = await chat(
    [
      {
        role: "system",
        content: `You are a cafeteria food waste reduction expert. Given waste data, provide exactly 3 specific, actionable recommendations. Each has a short type label and a 1-2 sentence explanation. Respond ONLY with a valid JSON object — no markdown, no explanation:
{"recommendations": [{"type": "Portion Control", "text": "...", "color": "green"}, {"type": "...", "text": "...", "color": "blue"}, {"type": "...", "text": "...", "color": "yellow"}]}
color must be one of: green, blue, yellow`,
      },
      {
        role: "user",
        content: `Generate recommendations for this waste data:\n${summary}`,
      },
    ],
    true
  );

  const colorMap = { green: "#51904e", blue: "#3b82f6", yellow: "#f59e0b" };
  return result.recommendations.map((r) => ({
    ...r,
    color: colorMap[r.color] ?? "#51904e",
  }));
}

// ── Chatbot: answer questions about the waste data ────────────────────────────
// Returns: string
export async function askWasteAnalyst(userMessage, reportData, conversationHistory = []) {
  const systemContext = `You are an AI food waste analyst for a cafeteria monitoring system. You have access to the following waste data:

Top wasted items: ${reportData.topWasted.map((i) => `${i.name} (avg ${i.avg}% waste, ${i.count} occurrences, trend: ${i.trend})`).join(", ")}
Weekly waste trend: ${reportData.bar.map((b) => `${b.day}: ${b.pct}%`).join(", ")}
Best performing meal: ${reportData.stats.bestMeal}
Total food processed: ${reportData.stats.totalFoodKg}kg
Total waste detected: ${reportData.stats.totalWasteKg}kg
Estimated cost of waste: $${reportData.stats.estimatedCost}

Answer questions concisely and helpfully. Give specific, data-driven insights when possible. Keep responses under 3 sentences unless asked for detail.`;

  const messages = [
    { role: "system", content: systemContext },
    ...conversationHistory,
    { role: "user", content: userMessage },
  ];

  return chat(messages, false);
}