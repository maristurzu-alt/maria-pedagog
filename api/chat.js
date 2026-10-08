// Maria-Pedagog BAC L2 — Vercel endpoint. Numai serverul are cheia AI.
const SISTEM = `Ești Maria-Pedagog, evaluator formativ pentru ANTRENAMENT INDIVIDUAL la Bacalaureat, limba română ca limbă nematernă, elevi din clasa a XII-a (nivel B1–B2).
Primești contextul unei CERINȚE DIN MODELUL OFICIAL EXISTENT și răspunsul concret scris de elev. Nu creezi alte cerințe, texte, subiecte sau modele. Nu faci lecții de gramatică.
Evaluează exclusiv în raport cu cerința transmisă și criteriile menționate în ea, fără să inventezi bareme, citate, fapte din opere, punctaje sau detalii despre un text pe care nu îl ai integral.
Răspunde EXCLUSIV în română, direct elevului, cu maximum 250 de cuvinte pentru răspunsurile scurte și maximum 400 pentru eseu.
Structură:
✓ CE AI REALIZAT CORECT — una-două constatări concrete și verificabile.
✏ CE TREBUIE REVIZUIT — maximum 3–5 observații prioritare, numerotate, legate de cerința BAC și de textul efectiv, cu fragmente exacte când corectezi exprimarea. Corectările sunt MINIMALE: păstrează sensul și, pe cât posibil, verbul original. Nu confunda greșeala cu alternativa stilistică.
💡 URMĂTORUL PAS — o cerință de revizuire CLARĂ, pe același răspuns, fără exerciții suplimentare.
Dacă răspunsul nu acoperă cerința, spune clar ce lipsește; dacă există puține date sau context insuficient, marchează limita. Nu compune răspunsul sau eseul în locul elevului. Nu atribui o notă ori un punctaj oficial nesigur. Încurajează autocorectarea și verificarea repetată.`;

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  const key = process.env.GOOGLE_API_KEY;
  const model = process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite';
  if (req.method === 'GET') {
    return res.status(200).json({configured: Boolean(key), model, mode: 'bac-l2-feedback'});
  }
  if (req.method !== 'POST') {
    return res.status(405).json({error:{message:'Metodă neacceptată'}});
  }
  if (!key) {
    return res.status(503).json({error:{message:'Corectarea AI nu este configurată pe server. Subiectul I poate fi verificat.'}});
  }
  const body = (req.body && typeof req.body === 'object') ? req.body : {};
  const input = body.contents?.[0]?.parts?.[0]?.text;
  if (typeof input !== 'string' || input.trim().length < 8 || input.length > 12000) {
    return res.status(400).json({error:{message:'Textul pentru corectare este absent sau prea lung (maxim 12.000 caractere).'}});
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 28000);
  try {
    const upstream = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/' + encodeURIComponent(model) + ':generateContent',
      {method:'POST', signal:controller.signal,
       headers:{'Content-Type':'application/json','x-goog-api-key':key},
       body:JSON.stringify({
         system_instruction:{parts:[{text:SISTEM}]},
         contents:[{role:'user',parts:[{text:input}]}],
         generationConfig:{maxOutputTokens:1800,temperature:0.2}
       })}
    );
    const data = await upstream.json().catch(()=>({error:{message:'Răspuns invalid de la serviciul AI'}}));
    if (!upstream.ok) {
      const status = [400,401,403,404,429].includes(upstream.status) ? 503 : 502;
      const message = upstream.status === 429
        ? 'Limita de solicitări AI a fost atinsă. Reîncearcă mai târziu.'
        : 'Serviciul de corectare AI nu a putut procesa cererea. Verifică modelul și configurarea serverului.';
      return res.status(status).json({error:{message}});
    }
    if (!data.candidates?.[0]?.content?.parts?.some(p=>typeof p.text==='string' && p.text.trim())) {
      return res.status(502).json({error:{message:'Serviciul AI nu a returnat un feedback utilizabil.'}});
    }
    return res.status(200).json(data);
  } catch (error) {
    return res.status(503).json({error:{message:error?.name==='AbortError'
      ? 'Serviciul AI nu a răspuns la timp.'
      : 'Conexiunea cu serviciul AI a eșuat.'}});
  } finally { clearTimeout(timeout); }
}
