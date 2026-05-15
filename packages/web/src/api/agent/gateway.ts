import { createOpenAI } from "@ai-sdk/openai";

// Fireworks AI is OpenAI-compatible
export const fireworks = createOpenAI({
  baseURL: "https://api.fireworks.ai/inference/v1",
  apiKey: process.env.AI_GATEWAY_API_KEY,
});

// Best tool-capable model on this account
export const model = fireworks("accounts/fireworks/models/deepseek-v4-pro");
