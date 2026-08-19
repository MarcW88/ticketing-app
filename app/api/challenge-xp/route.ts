import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const { label } = await req.json();

  const apiKey = process.env.OPENAI_API_KEY;

  if (apiKey) {
    try {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          max_tokens: 60,
          messages: [
            {
              role: 'system',
              content:
                "Tu es un coach de productivité. L'utilisateur définit un défi XP pour une période de travail. " +
                "En fonction du libellé, estime un objectif XP réaliste entre 100 et 3000. " +
                "Réponds UNIQUEMENT avec un JSON { \"xp\": number, \"reason\": string } sans texte autour.",
            },
            { role: 'user', content: `Défi : "${label}"` },
          ],
        }),
      });
      const data = await res.json();
      const raw = data.choices?.[0]?.message?.content?.trim() ?? '';
      const parsed = JSON.parse(raw);
      if (parsed?.xp) return NextResponse.json({ xp: parsed.xp, reason: parsed.reason ?? '' });
    } catch {
      // fall through to heuristic
    }
  }

  // Heuristic fallback (no API key or error)
  const text = label.toLowerCase();
  let xp = 400;
  let reason = 'Estimation par défaut';
  if (text.includes('mois') || text.includes('month'))     { xp = 2500; reason = 'Défi mensuel'; }
  else if (text.includes('semaine') || text.includes('sprint') || text.includes('week')) { xp = 700; reason = 'Sprint hebdomadaire'; }
  else if (text.includes('jour') || text.includes('day') || text.includes('daily'))      { xp = 180; reason = 'Objectif journalier'; }
  else if (text.includes('intense') || text.includes('rush') || text.includes('hard'))   { xp = 900; reason = 'Session intense'; }
  else if (text.includes('léger') || text.includes('tranquille') || text.includes('light')) { xp = 200; reason = 'Rythme léger'; }

  return NextResponse.json({ xp, reason });
}
