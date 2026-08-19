export interface GeneralAnswer {
  text: string
  confidence: number
}

const TOPICS: { keys: RegExp; answer: string }[] = [
  {
    keys: /\b(fourier|transform|frequency domain|fft)\b/i,
    answer:
      'The Fourier transform decomposes a signal into its constituent frequencies. Any continuous, well-behaved signal can be represented as a sum of sinusoids, each with its own amplitude and phase. The transform F(ω) = ∫ f(t)·e^(−iωt) dt maps the time domain into the frequency domain, so operations like filtering, convolution, and spectral analysis become straightforward. The fast Fourier transform (FFT) computes this in O(N log N) time, which is why it underpins everything from audio processing to radar and trading signal analysis.',
  },
  {
    keys: /\b(relativity|einstein|time dilation|general relativity)\b/i,
    answer:
      'General relativity, published by Einstein in 1915, describes gravity not as a force but as the curvature of spacetime caused by mass and energy. Massive objects warp the geometry around them; other objects travel along the straightest possible paths (geodesics) through that curved spacetime. The famous E = mc² relation emerges from its special-relativity foundation, and the theory predicts phenomena like gravitational lensing, gravitational waves, and the time dilation experienced near strong gravitational fields or at high velocity.',
  },
  {
    keys: /\b(lstm.*transformer|transformer.*lstm|difference between.*lstm|attention is all)/i,
    answer:
      'An LSTM (Long Short-Term Memory) is a recurrent network that processes sequences one token at a time, maintaining a hidden state and a gated memory cell. It is sequential by design and struggles to parallelize or capture very long-range dependencies. A Transformer abandons recurrence entirely: it processes all tokens in parallel and uses self-attention to compute pairwise relationships between every position. This parallelization enables training on far more data (scaling to models like GPT), and positional encodings give it order awareness. The trade-off is that attention scales quadratically with sequence length, whereas an LSTM is linear in time but sequential in execution.',
  },
  {
    keys: /\b(quantum|superposition|entanglement|qubit)\b/i,
    answer:
      'Quantum mechanics describes nature at the smallest scales. A qubit exists in a superposition of |0⟩ and |1⟩ until measured, and entanglement links the states of distant particles so that measuring one instantly constrains the other. This allows quantum computers to explore exponentially many states in parallel, with algorithms like Shor’s (factoring) and Grover’s (search) demonstrating theoretical speedups over classical approaches. Decoherence and error correction remain the primary engineering challenges.',
  },
  {
    keys: /\b(black hole|singularity|event horizon)\b/i,
    answer:
      'A black hole is a region where gravity is so intense that nothing — not even light — can escape beyond its event horizon. It forms when a massive star collapses and its core exceeds the Tolman–Oppenheimer–Volkoff limit. The event horizon is the boundary of no return; the singularity at the center is where known physics breaks down. Black holes are observed indirectly through their accretion disks, gravitational lensing, and the gravitational waves emitted when they merge.',
  },
  {
    keys: /\b(what is a (trade route|supply chain)|supply chain|maritime trade)\b/i,
    answer:
      'A trade route is a corridor along which goods, energy, and capital move between regions — by sea (shipping lanes, straits, canals), land (rail, road, pipelines), or air. Chokepoints like the Strait of Hormuz, Malacca, and the Suez Canal carry disproportionate global volume, so disruption there transmits instantly through prices. A supply chain is the full network of producers, transporters, and markets that turn raw material into delivered goods; its resilience depends on diversification, inventory, and the security of those routes.',
  },
  {
    keys: /\b(gdp|gross domestic product)\b/i,
    answer:
      'GDP is the monetary value of all final goods and services produced within a country in a given period, typically a quarter or year. It is measured via expenditure (C + I + G + net exports), income, or output approaches, which should theoretically reconcile. Real GDP adjusts for inflation, so it reflects volume of production. Growth in real GDP is the standard macro gauge of an economy expanding or contracting.',
  },
  {
    keys: /\b(inflation|cpi|consumer price)\b/i,
    answer:
      'Inflation is the rate at which the general price level rises, eroding purchasing power. It is typically measured by the Consumer Price Index (CPI), a basket of goods, or by the PCE deflator. Causes include demand-pull (too much spending), cost-push (rising input/energy costs), and monetary expansion. Central banks target low, stable inflation (commonly ~2%) and raise rates to cool it; energy and supply shocks can raise inflation even when demand is weak.',
  },
  {
    keys: /\b(hormuz|strait of hormuz)\b/i,
    answer:
      'The Strait of Hormuz is the narrow waterway between the Persian Gulf and the Gulf of Oman. Roughly one-fifth of global oil and a large share of LNG transits it, making it the world’s most critical energy chokepoint. Tensions between Iran and the US/Gulf states frequently raise risk premiums on crude because even a partial closure would force rerouting through longer, costlier lanes and draw down strategic reserves.',
  },
  {
    keys: /\b(lithium|rare earth|semiconductor.*supply|chip.*supply|tsmc)\b/i,
    answer:
      'Advanced industries concentrate in a few geographic hubs: TSMC manufactures the majority of the world’s most advanced chips in Taiwan, China dominates rare-earth processing, and lithium refining is concentrated in China/Australia. Because these inputs are hard to substitute and require years to scale, localized shocks — a strait crisis, export controls, or a mine strike — propagate through global electronics, defense, and EV supply chains and hit prices and output quickly.',
  },
]

const GREETING = /\b(hello|hi|hey|good morning|good evening|good afternoon|yo|sup)\b/i

function safeEvalMath(expr: string): string | null {
  const cleaned = expr.replace(/[×x]/g, '*').replace(/÷/g, '/').replace(/[−–]/g, '-')
  if (!/^[\d\s+\-*/().%^]+$/.test(cleaned)) return null
  const tokens = cleaned.match(/\d+(\.\d+)?|[+\-*/^()]/g)
  if (!tokens) return null
  try {
    const out: number[] = []
    const ops: string[] = []
    const prec: Record<string, number> = { '+': 1, '-': 1, '*': 2, '/': 2, '^': 3 }
    const apply = () => {
      const op = ops.pop()
      const b = out.pop() as number
      const a = out.pop() as number
      if (op === '+') out.push(a + b)
      else if (op === '-') out.push(a - b)
      else if (op === '*') out.push(a * b)
      else if (op === '/') out.push(b === 0 ? NaN : a / b)
      else out.push(Math.pow(a, b))
    }
    for (const t of tokens) {
      if (/^\d/.test(t)) out.push(parseFloat(t))
      else if (t === '(') ops.push(t)
      else if (t === ')') {
        while (ops.length && ops[ops.length - 1] !== '(') apply()
        ops.pop()
      } else {
        while (ops.length && ops[ops.length - 1] !== '(' && prec[ops[ops.length - 1]] >= prec[t]) apply()
        ops.push(t)
      }
    }
    while (ops.length) apply()
    const result = out[0]
    if (typeof result !== 'number' || !Number.isFinite(result)) return null
    return String(Number(result.toFixed(6)))
  } catch {
    return null
  }
}

function answerMath(transcript: string): string | null {
  const cleaned = transcript.replace(/\s+/g, ' ').replace(/[?.,!]+$/, '').replace(/[×x]/g, '*').replace(/÷/g, '/').replace(/[−–]/g, '-')
  const m = cleaned.match(/([\d\s+\-*/().%^]+)\s*[=]?\s*$/)
  if (!m) return null
  const expr = m[1].trim()
  if (!/\d/.test(expr)) return null
  const value = safeEvalMath(expr)
  return value != null ? `${expr.trim()} = ${value}` : null
}

export function generalAnswer(transcript: string): GeneralAnswer {
  const trimmed = transcript.trim()
  if (!trimmed) return { text: 'I am listening. Ask me anything — markets, science, code, or the world.', confidence: 0.4 }

  const math = answerMath(trimmed)
  if (math) return { text: math, confidence: 0.95 }

  if (GREETING.test(trimmed)) {
    return {
      text: 'Good to hear you. JARVIS is online. I can analyze markets and geopolitics through MarketAtlas, or reason about anything else — science, code, history, mathematics. What do you need?',
      confidence: 0.9,
    }
  }

  for (const topic of TOPICS) {
    if (topic.keys.test(trimmed)) {
      return { text: topic.answer, confidence: 0.85 }
    }
  }

  const codeSignals = /\b(write|code|script|function|program|python|javascript|typescript|sql|regex|algorithm)\b/i
  if (codeSignals.test(trimmed)) {
    return {
      text: 'I can help with code. Describe the task precisely — the language, the input, and the expected output — and I will produce a working implementation, explain the approach, and note edge cases.',
      confidence: 0.5,
    }
  }

  const question = /\b(why|how|what|who|when|where|which|explain|define|difference|compare)\b/i
  if (question.test(trimmed)) {
    return {
      text: 'I am reasoning about that now. In offline mode my general knowledge is limited to a curated set of topics — for full depth, connect the backend LLM (OpenAI, Gemini, Claude, or Ollama) so I can answer any question directly.',
      confidence: 0.35,
    }
  }

  return {
    text: 'I am listening. Ask me about the world — routes, countries, risk, markets — or anything else: science, code, history, or mathematics.',
    confidence: 0.4,
  }
}