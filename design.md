# Design — Hermes Docs AI

## Vibe
Dark, terminal-native, intelligent. Think Hermes Agent itself — not a generic chatbot. Feels like talking directly to the docs.

## Color
- Background: `#0a0a0a` (near-black)
- Surface: `#111111` / `#1a1a1a`
- Border: `#2a2a2a`
- Accent: `#f97316` (orange-500) — Hermes brand orange
- Accent muted: `#7c3a1e`
- Text primary: `#f5f5f5`
- Text muted: `#888`
- Code bg: `#1e1e1e`

## Typography
- Font: JetBrains Mono (monospaced, matches terminal feel) for code/metadata; Inter for body text
- Heading: Inter, 600 weight
- Code blocks: JetBrains Mono

## Layout
- Single page chat
- Left sidebar: thin, dark — logo + branding + version badge
- Main: full-height chat window
- Input: floating bar at bottom with send button in orange
- Messages: user right-aligned (orange tint bg), assistant left-aligned (dark surface)

## Motion
- Messages fade+slide in on arrival
- Streaming text: cursor blink effect
- Loading: animated dots matching orange accent

## Components
- Starter suggestion chips styled like the original GPT but in dark/orange
- Source citations rendered inline below each answer
- Code blocks with syntax highlighting + copy button
