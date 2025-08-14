import React, { useEffect, useRef, useState } from "react";

/**
 * FlirtQuest – Prototipo en React (una sola pieza)
 * ------------------------------------------------
 * Fixes:
 * - Fixed invalid template literal/object syntax in MessageBubble className.
 * - Extracted pure helpers for class computation and chemistry to enable tests.
 * - Added lightweight runtime tests (console) for critical helpers.
 *
 * Características:
 * - Chat en vivo con personaje IA (modo simulado por defecto, sin backend).
 * - Selector de escenario y personalidad.
 * - Medidor de "Química" que sube/baja según el tono del mensaje del jugador.
 * - Eventos/imprevistos aleatorios del entorno que cambian el tema de la conversación.
 * - Objetivos ligeros (icebreakers) para guiar la interacción.
 * - Modo API (opcional): pega una API key de OpenAI en runtime (localStorage) y el prototipo llamará a /v1/responses.
 *   ⚠️ No uses una API key real en producción del lado del cliente.
 *
 * Cómo probar aquí mismo:
 * - Funciona tal cual en MODO SIMULADO. Escribe y la "IA" contestará con lógica básica.
 * - Para activar MODO API: abre la consola y ejecuta localStorage.setItem('OPENAI_API_KEY', 'sk-...'); recarga.
 *   También puedes pegar la clave en el campo de ajustes (icono ⚙️ en la cabecera).
 */

// ------------------------- utilidades ligeras -------------------------
const delay = (ms) => new Promise((r) => setTimeout(r, ms));

const personalities = {
  "Tímida": {
    system: "Eres una persona dulce, de pocas palabras, observadora, con humor suave.",
    style: "respuestas cortas, preguntas curiosas, evita intensidades altísimas",
  },
  "Sarcástica": {
    system: "Eres ingeniosa y algo burlona, pero no cruel. Juegas con dobles sentidos.",
    style: "bromas secas, coqueteo indirecto, guiños",
  },
  "Apasionada": {
    system: "Eres directa, intensa y romántica. Te gusta llevar la iniciativa.",
    style: "piropos, metáforas, energía alta",
  },
  "Nerd": {
    system: "Te encantan ciencia, juegos y referencias frikis. Flirteas con datos y analogías.",
    style: "humor geek, referencias pop, curiosidad genuina",
  },
};

const scenes = {
  "Cafetería": "Aromas a café, música suave, gente tecleando en laptops.",
  "Biblioteca": "Silencio elegante, pasillos de libros, miradas cómplices entre estantes.",
  "Fiesta": "Luz baja, reggaetón suave, amigos alrededor, risas y vasos tintineando.",
  "App de citas": "Interfaz minimal, match reciente, chat dentro de la app.",
};

const objectives = [
  "Consigue que te cuente un hobby extraño.",
  "Logra que ría con un chiste ligero.",
  "Proponle un plan para otro día y obtén un 'sí'.",
  "Descubre su comida favorita.",
  "Consigue un cumplido de vuelta.",
];

// Palabras suaves/positivas para subir química, y rojas para bajarla
const positiveHints = ["gracias", "bonito", "contigo", "interes", "me gusta", "plan", "divert"];
const negativeHints = ["aburr", "tonto", "feo", "molest", "groser", "nunca", "estup"];

// Imprevistos de escenario
const randomEvents = {
  "Cafetería": [
    "Se cayó un latte cerca y salpicó un poco la mesa. ¿Lo tomas con humor?",
    "El barista anuncia micro abierto: ¡poesía o canción?",
  ],
  "Biblioteca": [
    "La bibliotecaria pide silencio extremo y te lanza una mirada. ¿Susurras?",
    "Encuentran un libro con dedicatoria romántica de 1998. ¿Lo comentas?",
  ],
  "Fiesta": [
    "Se corta la música unos segundos; momento de charla íntima.",
    "Un amigo interrumpe para presentar un juego de verdad o reto.",
  ],
  "App de citas": [
    "La app sugiere una pregunta de rompehielos inesperada.",
    "Aparece una notificación de match mutuo en un plan de eventos local.",
  ],
};

// ------------------------- helpers puros (testeables) -------------------------
export function getBubbleClasses({ isEvent, isAI }) {
  const base = "max-w-[85%] rounded-2xl px-4 py-3 border";
  const variant = isEvent
    ? "bg-amber-900/20 border-amber-700/40 text-amber-200"
    : isAI
    ? "bg-neutral-800 border-neutral-700"
    : "bg-emerald-900/20 border-emerald-700/40";
  return `${base} ${variant}`;
}

export function computeChemistry(current, text) {
  const lower = (text || "").toLowerCase();
  let delta = 0;
  if (positiveHints.some((h) => lower.includes(h))) delta += 6;
  if (negativeHints.some((h) => lower.includes(h))) delta -= 10;
  if (/gracias|perd[oó]n|disculp/.test(lower)) delta += 3;
  if (/numero|whatsapp|tel[eé]fono/.test(lower)) delta -= 6; // pedir contacto muy pronto
  if (/salir|cita|plan/.test(lower)) delta += 4; // proactividad cuenta
  const next = current + delta;
  return Math.max(0, Math.min(100, next));
}

// ------------------------- motor simulado -------------------------
function simulateAIReply({ msg, personality, scene, chemistry }) {
  const lower = msg.toLowerCase();
  const isQuestion = /\?|como|qué|que|dónde|donde|por qué|porque|cuando|cuándo/.test(lower);

  // tono base por personalidad
  const tone = {
    "Tímida": [
      "jeje, qué lindo lo dices…",
      "me haces sonreír :)",
      "creo que me pones nerviosa, en el buen sentido",
    ],
    "Sarcástica": [
      "vaya, ¿ensayaste esa línea en el espejo?",
      "no está mal… para ser tu primer intento 😉",
      "¿esa era tu carta fuerte o tienes DLC?",
    ],
    "Apasionada": [
      "me encanta tu energía, se siente eléctrica",
      "lo dices y me imagino el plan ahora mismo",
      "si seguimos así, alguien se va a enamorar",
    ],
    "Nerd": [
      "dato random: los pulpos tienen 3 corazones, yo ahora mismo 4 x ti",
      "esa broma tiene buen ratio señal/ruido",
      "esto tiene química, literal y figurada",
    ],
  }[personality];

  // plantilla rápida
  const greet = isQuestion ? "pregunta interesante…" : "me gusta cómo lo planteas…";
  const spice = tone[Math.floor(Math.random() * tone.length)];

  // alude al escenario
  const sceneBit = {
    Cafetería: "(entre aroma a espresso)",
    Biblioteca: "(susurrando entre estantes)",
    Fiesta: "(con la música bajita de fondo)",
    "App de citas": "(match con vibes bonitas)",
  }[scene];

  // respuesta algo personalizada
  let reply = `${sceneBit} ${greet} ${spice}`;

  if (lower.includes("plan") || lower.includes("salir") || lower.includes("cita")) {
    reply += " ¿te laten los planes espontáneos? tengo un par de ideas.";
  }
  if (lower.includes("chiste") || lower.includes("risa")) {
    reply += " ok, mini chiste: ¿por qué el café se fue a terapia? porque tenía muchos problemas de filtro.";
  }

  // añade pregunta para mantener flujo
  const followups = [
    "¿qué te hace ilusión esta semana?",
    "si pudiéramos escapar 2 horas, ¿a dónde vamos?",
    "¿te gustan más las pelis o las series para plan tranqui?",
  ];
  reply += " " + followups[Math.floor(Math.random() * followups.length)];

  // pequeña variación con química
  if (chemistry > 75) reply += " (prometo no arruinar nuestra racha 😌)";
  if (chemistry < 30) reply += " (eres divertido, solo… baja un 2% la intensidad)";

  return reply;
}

// ------------------------- llamada a OpenAI (opcional) -------------------------
async function callOpenAI(messages, personality, scene) {
  const apiKey = localStorage.getItem("OPENAI_API_KEY");
  if (!apiKey) return null; // sin clave -> que el motor simulado conteste

  const sys = `Eres un interés romántico en un juego de citas. Mantén el coqueteo respetuoso, ingenioso y acorde a tu personalidad (${personality}). Escenario: ${scene}. Responde en 1-3 frases, incluye una pregunta para mantener la conversación. Evita contenido explícito.`;

  // API Responses (más sencilla que chat.completions y soporta tool use)
  const body = {
    model: "gpt-4.1-mini",
    input: messages,
    // Inyectamos un mensaje de sistema al frente
    messages: [{ role: "system", content: sys }, ...messages],
    max_output_tokens: 160,
  };

  try {
    const resp = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!resp.ok) throw new Error(await resp.text());

    const data = await resp.json();
    // data.output_text está disponible en Responses API
    const text = data.output_text || data.choices?.[0]?.message?.content || "";
    return (text || "").trim();
  } catch (e) {
    console.warn("Fallo llamada OpenAI:", e);
    return null; // fallback al modo simulado
  }
}

// ------------------------- UI principal -------------------------
export default function FlirtQuest() {
  const [scene, setScene] = useState("Cafetería");
  const [personality, setPersonality] = useState("Nerd");
  const [chemistry, setChemistry] = useState(50);
  const [messages, setMessages] = useState([
    {
      role: "ai",
      text: "Hola… creo que hicimos match de timing y de vibra. ¿Cómo te llamo?",
      ts: Date.now(),
    },
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [goal, setGoal] = useState(() => objectives[Math.floor(Math.random() * objectives.length)]);
  const [apiKeyInput, setApiKeyInput] = useState(localStorage.getItem("OPENAI_API_KEY") || "");
  const [showSettings, setShowSettings] = useState(false);
  const listRef = useRef(null);

  // Auto scroll
  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages, busy]);

  // Evento aleatorio cada 4 turnos del usuario
  useEffect(() => {
    const userTurns = messages.filter((m) => m.role === "user").length;
    if (userTurns > 0 && userTurns % 4 === 0) {
      const opts = randomEvents[scene] || [];
      if (opts.length) {
        const ev = opts[Math.floor(Math.random() * opts.length)];
        setMessages((prev) => [...prev, { role: "event", text: ev, ts: Date.now() }]);
      }
    }
  }, [messages, scene]);

  function adjustChemistry(text) {
    return computeChemistry(chemistry, text);
  }

  async function send() {
    const text = input.trim();
    if (!text || busy) return;
    const nextChem = adjustChemistry(text);

    setMessages((prev) => [...prev, { role: "user", text, ts: Date.now() }]);
    setInput("");
    setChemistry(nextChem);
    setBusy(true);

    // construir historial corto para el modelo
    const history = messages
      .slice(-8)
      .map((m) => ({ role: m.role === "ai" ? "assistant" : m.role, content: m.text }));
    const payload = [...history, { role: "user", content: text }];

    // Primero intentamos OpenAI; si no hay clave o falla, simulamos
    let aiText = await callOpenAI(payload, personality, scene);
    if (!aiText) {
      await delay(500 + Math.random() * 700);
      aiText = simulateAIReply({ msg: text, personality, scene, chemistry: nextChem });
    }

    setMessages((prev) => [...prev, { role: "ai", text: aiText, ts: Date.now() }]);
    setBusy(false);
  }

  function resetChat() {
    setMessages([
      { role: "ai", text: "¿Volvemos a empezar? Esta vez siento chispa desde el inicio.", ts: Date.now() },
    ]);
    setChemistry(50);
    setGoal(objectives[Math.floor(Math.random() * objectives.length)]);
  }

  function saveApiKey() {
    if (apiKeyInput.trim()) localStorage.setItem("OPENAI_API_KEY", apiKeyInput.trim());
    else localStorage.removeItem("OPENAI_API_KEY");
  }

  const MOCK_MODE = !localStorage.getItem("OPENAI_API_KEY");

  return (
    <div className="min-h-screen w-full bg-neutral-950 text-neutral-100">
      {/* cabecera */}
      <div className="sticky top-0 z-10 backdrop-blur bg-neutral-950/80 border-b border-neutral-800">
        <div className="max-w-4xl mx-auto flex items-center justify-between p-3 gap-2">
          <div className="flex items-center gap-3">
            <span className="text-xl font-semibold">FlirtQuest</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-neutral-800 border border-neutral-700">
              {MOCK_MODE ? "Simulado" : "API activa"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSettings((s) => !s)}
              className="px-3 py-1 rounded-xl bg-neutral-800 hover:bg-neutral-700 transition border border-neutral-700"
            >
              ⚙️ Ajustes
            </button>
            <button
              onClick={resetChat}
              className="px-3 py-1 rounded-xl bg-neutral-800 hover:bg-neutral-700 transition border border-neutral-700"
            >
              🔄 Reiniciar
            </button>
          </div>
        </div>
      </div>

      {/* ajustes */}
      {showSettings && (
        <div className="max-w-4xl mx-auto p-4 grid md:grid-cols-3 gap-4">
          <div className="col-span-2 grid sm:grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-sm text-neutral-400">Escenario</label>
              <select
                value={scene}
                onChange={(e) => setScene(e.target.value)}
                className="bg-neutral-900 border border-neutral-700 rounded-xl p-2"
              >
                {Object.keys(scenes).map((k) => (
                  <option key={k}>{k}</option>
                ))}
              </select>
              <p className="text-xs text-neutral-400 mt-1">{scenes[scene]}</p>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-sm text-neutral-400">Personalidad</label>
              <select
                value={personality}
                onChange={(e) => setPersonality(e.target.value)}
                className="bg-neutral-900 border border-neutral-700 rounded-xl p-2"
              >
                {Object.keys(personalities).map((k) => (
                  <option key={k}>{k}</option>
                ))}
              </select>
              <p className="text-xs text-neutral-400 mt-1">{personalities[personality].style}</p>
            </div>
          </div>

          <div className="col-span-1 flex flex-col gap-2">
            <label className="text-sm text-neutral-400">OpenAI API Key (opcional)</label>
            <input
              value={apiKeyInput}
              onChange={(e) => setApiKeyInput(e.target.value)}
              placeholder="sk-..."
              className="bg-neutral-900 border border-neutral-700 rounded-xl p-2"
            />
            <button
              onClick={saveApiKey}
              className="px-3 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 transition border border-neutral-700"
            >
              Guardar clave
            </button>
            <p className="text-xs text-neutral-400">
              Se guarda en tu navegador como demo. No uses esta técnica en producción.
            </p>
          </div>
        </div>
      )}

      {/* meta barra */}
      <div className="max-w-4xl mx-auto px-4 md:px-6 py-3 grid md:grid-cols-3 gap-3">
        <div className="col-span-2 flex items-center gap-3">
          <div className="flex-1">
            <div className="flex items-center justify-between text-xs text-neutral-400 mb-1">
              <span>Química</span>
              <span>{chemistry}%</span>
            </div>
            <div className="h-2 w-full bg-neutral-800 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500 transition-all" style={{ width: `${chemistry}%` }} />
            </div>
          </div>
          <div className="text-xs text-neutral-400 px-3 py-2 bg-neutral-900 rounded-xl border border-neutral-800">
            🎯 Objetivo: {goal}
          </div>
        </div>
        <div className="col-span-1 text-xs text-neutral-400 flex items-center">
          <span className="truncate">Escena: {scene} • Personalidad: {personality}</span>
        </div>
      </div>

      {/* chat */}
      <div className="max-w-4xl mx-auto p-4">
        <div
          ref={listRef}
          className="h-[60vh] md:h-[64vh] overflow-y-auto bg-neutral-900/40 border border-neutral-800 rounded-2xl p-3"
        >
          {messages.map((m, idx) => (
            <MessageBubble key={idx} m={m} />
          ))}
          {busy && <TypingIndicator />}
        </div>

        {/* input */}
        <div className="mt-3 flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
            placeholder="Di algo con encanto…"
            className="flex-1 bg-neutral-900 border border-neutral-700 rounded-2xl px-4 py-3"
          />
          <button
            onClick={send}
            disabled={busy}
            className="px-5 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60"
          >
            Enviar
          </button>
        </div>

        {/* tips */}
        <div className="mt-3 text-xs text-neutral-400">
          Consejito: evita pedir contacto muy pronto, suma puntos con humor y curiosidad genuina.
        </div>
      </div>

      {/* pie */}
      <div className="max-w-4xl mx-auto p-4 text-center text-xs text-neutral-500">
        Prototipo para navegador. Contenido sugerente, no explícito. Juega con respeto.
      </div>
    </div>
  );
}

function MessageBubble({ m }) {
  const isAI = m.role === "ai";
  const isEvent = m.role === "event";
  return (
    <div className={`my-2 flex ${isAI || isEvent ? "justify-start" : "justify-end"}`}>
      <div className={getBubbleClasses({ isEvent, isAI })}>
        <div className="text-xs opacity-70 mb-1">{isEvent ? "Imprevisto" : isAI ? "Crush IA" : "Tú"}</div>
        <div className="whitespace-pre-wrap leading-relaxed">{m.text}</div>
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="my-2 flex justify-start">
      <div className="bg-neutral-800 border border-neutral-700 rounded-2xl px-4 py-3 text-neutral-300">
        <div className="text-xs opacity-70 mb-1">Crush IA</div>
        <div className="flex gap-1">
          <Dot /> <Dot delay={100} /> <Dot delay={200} />
        </div>
      </div>
    </div>
  );
}

function Dot({ delay = 0 }) {
  const [on, setOn] = useState(false);
  useEffect(() => {
    const id = setInterval(() => setOn((v) => !v), 400 + delay);
    return () => clearInterval(id);
  }, [delay]);
  return <span className={`w-2 h-2 rounded-full inline-block ${on ? "bg-neutral-300" : "bg-neutral-500"}`} />;
}

// ------------------------- DEV TESTS (ligeros) -------------------------
// Nota: no alteran el juego; solo escriben al console. Son "test cases" básicos.
(function runDevTests() {
  try {
    const results = [];
    // getBubbleClasses tests
    results.push([
      "getBubbleClasses(event)",
      /amber-900\/20/.test(getBubbleClasses({ isEvent: true, isAI: false })),
    ]);
    results.push([
      "getBubbleClasses(ai)",
      /neutral-800/.test(getBubbleClasses({ isEvent: false, isAI: true })),
    ]);
    results.push([
      "getBubbleClasses(user)",
      /emerald-900\/20/.test(getBubbleClasses({ isEvent: false, isAI: false })),
    ]);

    // computeChemistry bounds
    const up = computeChemistry(50, "gracias, me gusta tu plan");
    const down = computeChemistry(50, "esto es estúpido, dame tu whatsapp");
    results.push(["computeChemistry increases on positive", up > 50]);
    results.push(["computeChemistry decreases on negative/contact", down < 50]);
    results.push([
      "computeChemistry lower bound",
      computeChemistry(1, "estúpido feo grosero") >= 0,
    ]);
    results.push([
      "computeChemistry upper bound",
      computeChemistry(99, "gracias me encanta este plan divertidísimo") <= 100,
    ]);

    // simulateAIReply basic shape
    const sim = simulateAIReply({ msg: "¿hacemos un plan?", personality: "Nerd", scene: "Cafetería", chemistry: 80 });
    results.push(["simulateAIReply returns string", typeof sim === "string" && sim.length > 0]);

    const failed = results.filter(([, ok]) => !ok);
    if (failed.length) {
      console.group("FlirtQuest DEV TESTS – FAILURES");
      for (const [name, ok] of failed) console.error("✗", name, ok);
      console.groupEnd();
    } else {
      console.groupCollapsed("FlirtQuest DEV TESTS – all passed");
      for (const [name] of results) console.log("✓", name);
      console.groupEnd();
    }
  } catch (e) {
    console.warn("Dev tests error (non-fatal):", e);
  }
})();
