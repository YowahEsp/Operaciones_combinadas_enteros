/* ==========================================================================
   Motor de operaciones combinadas con NÚMEROS ENTEROS — método de Yowah
   (CEPA Tetuán). App hermana de «Operaciones combinadas» (naturales).

   «En cada paso se hace la operación u operaciones que tienen prioridad
    y las demás no se tocan.»

   Reglas implementadas:
   1. Mientras haya paréntesis, corchetes, llaves o raíces con operaciones
      dentro, solo se trabaja dentro de los más internos. Lo de fuera no se
      toca. Un paréntesis que solo envuelve un número, como (−8), no es una
      operación pendiente: es la forma de escribir un número con signo.
   2. Entre todos esos, se hace el nivel más alto que haya, y solo ese:
        a) quitar paréntesis: dos signos seguidos se convierten en uno,
           −(−8) = +8 (va con el 1.º de la jerarquía, como en el libro);
        b) potencias y raíces;
        c) multiplicaciones y divisiones;
        d) sumas y restas.
   3. Una cadena del mismo nivel se resuelve en un solo paso, de izquierda
      a derecha.
   4. Si un paréntesis, corchete o llave queda en un solo número, desaparece
      en ese mismo paso. Si el número es negativo y va detrás de un signo,
      se escribe entre paréntesis: 4 · (3 − 8) → 4 · (−5).
   5. El signo que va delante de una multiplicación no se toca hasta su
      turno: 9 − 4 · (−5) → 9 − (−20) → 9 + 20.
   ========================================================================== */
const Motor = (() => {
  'use strict';

  const MAX_DIGITOS = 9;
  const MAX_PASOS = 80;
  const MAX_EXP = 20;
  const SUPER = '⁰¹²³⁴⁵⁶⁷⁸⁹';

  class ErrorMates extends Error {
    constructor(msg, pos) { super(msg); this.pos = pos; }
  }

  const CIERRE = { '(': ')', '[': ']', '{': '}' };
  const NOMBRE = { '(': 'paréntesis', '[': 'corchete', '{': 'llave', '√': 'raíz' };
  const EL = { '(': 'el paréntesis', '[': 'el corchete', '{': 'la llave', '√': 'la raíz' };
  const LOS = { '(': 'los paréntesis', '[': 'los corchetes', '{': 'las llaves', '√': 'las raíces' };
  const DEL = { '(': 'del paréntesis', '[': 'del corchete', '{': 'de la llave', '√': 'de la raíz' };
  const DELOS = { '(': 'de los paréntesis', '[': 'de los corchetes', '{': 'de las llaves', '√': 'de las raíces' };
  const mayus = s => s[0].toUpperCase() + s.slice(1);

  /* ---------- Escritura de números ---------- */
  const fmt = v => (v < 0 ? '−' + (-v) : String(v));          // −5
  const fmtS = v => (v > 0 ? '+' + v : fmt(v));                // +5, −5, 0
  const fmtP = v => (v < 0 ? `(${fmt(v)})` : String(v));       // (−5), 5
  const sup = n => String(n).split('').map(d => SUPER[+d]).join('');
  const limpio = v => (v === 0 ? 0 : v);                        // sin −0

  /* ---------- Análisis léxico ---------- */
  function tokenizar(src) {
    const toks = [];
    for (let i = 0; i < src.length; i++) {
      const c = src[i];
      if (/\s/.test(c)) continue;
      if (/[0-9]/.test(c)) {
        let j = i;
        while (j < src.length && /[0-9]/.test(src[j])) j++;
        const txt = src.slice(i, j);
        if (txt.length > MAX_DIGITOS)
          throw new ErrorMates(`El número ${txt} es demasiado largo (máximo ${MAX_DIGITOS} cifras).`, i);
        toks.push({ t: 'num', v: parseInt(txt, 10), pos: i });
        i = j - 1;
        continue;
      }
      if (SUPER.includes(c)) {
        let j = i;
        while (j < src.length && SUPER.includes(src[j])) j++;
        const v = parseInt(src.slice(i, j).split('').map(x => SUPER.indexOf(x)).join(''), 10);
        toks.push({ t: 'exp', v, pos: i });
        i = j - 1;
        continue;
      }
      if (c === '^') {
        let j = i + 1;
        while (j < src.length && /\s/.test(src[j])) j++;
        let k = j;
        while (k < src.length && /[0-9]/.test(src[k])) k++;
        if (k === j) throw new ErrorMates('Detrás de «^» va el exponente: por ejemplo, (−2)^3.', i);
        toks.push({ t: 'exp', v: parseInt(src.slice(j, k), 10), pos: i });
        i = k - 1;
        continue;
      }
      const palabra = src.slice(i).match(/^(raíz|raiz|sqrt)/i);
      if (palabra) { toks.push({ t: 'raiz', pos: i }); i += palabra[0].length - 1; continue; }
      if (c === '√') { toks.push({ t: 'raiz', pos: i }); continue; }
      if (c === '+') { toks.push({ t: 'op', v: '+', pos: i }); continue; }
      if ('-−–—'.includes(c)) { toks.push({ t: 'op', v: '−', pos: i }); continue; }
      if ('*xX×·⋅•∙'.includes(c)) { toks.push({ t: 'op', v: '·', pos: i }); continue; }
      if (':/÷∶'.includes(c)) { toks.push({ t: 'op', v: ':', pos: i }); continue; }
      if ('([{'.includes(c)) { toks.push({ t: 'abre', v: c, pos: i }); continue; }
      if (')]}'.includes(c)) { toks.push({ t: 'cierra', v: c, pos: i }); continue; }
      if (c === '.' || c === ',' || c === "'")
        throw new ErrorMates('Solo números enteros: sin decimales. Para multiplicar usa · , * o x.', i);
      throw new ErrorMates(`No entiendo el signo «${c}».`, i);
    }
    return toks;
  }

  /* ---------- Análisis sintáctico ----------
     Expr   = [+|−] Term { (+|−) Term }
     Term   = Factor { (·|:) Factor }
     Factor = Base [exponente] | √ número | √( Expr )
     Base   = número | (±número) | ( Expr ) | [ Expr ] | { Expr }
     Nodos:
       {t:'num', v, par, mas}     par: va entre paréntesis, como (−8);
                                  mas: se escribió con +, como (+5)
       {t:'grp', k:'('|'['|'{'|'√', e:Expr}   ('√': lo de dentro de la raíz)
       {t:'pot', b:num|grp, n}
       {t:'raiz', a:num|grp('√')}
       {t:'term', s:'+'|'−'|null, fs:[Factor], ops:['·'|':']}
       {t:'expr', terms:[Term]}
     El primer término de cada expresión solo lleva signo si se escribió
     (−(…), −3², +6…); un número negativo al principio es un número: −4.    */
  function analizar(src) {
    if (!src || !src.trim()) throw new ErrorMates('Escribe una operación.', 0);
    const toks = tokenizar(src);
    let p = 0;
    const ver = (k = 0) => toks[p + k];
    const fin = () => p >= toks.length;
    const esSigno = tok => !!tok && tok.t === 'op' && (tok.v === '+' || tok.v === '−');

    function describir(tok) {
      if (!tok) return 'el final';
      if (tok.t === 'num') return `el ${tok.v}`;
      if (tok.t === 'exp') return 'el exponente';
      if (tok.t === 'raiz') return 'la raíz';
      return `«${tok.v}»`;
    }
    function describirFactor(f) {
      if (f.t === 'num') return f.par ? `el (${fmt(f.v)})` : `el ${fmt(f.v)}`;
      if (f.t === 'grp') return EL[f.k];
      if (f.t === 'pot') return 'la potencia';
      return 'la raíz';
    }

    // Lo que puede venir detrás de un signo + o −
    function trasSigno(op) {
      const sig = ver();
      if (!sig || sig.t === 'cierra')
        throw new ErrorMates(`Falta un número después de «${op}».`, sig ? sig.pos : src.length);
      if (sig.t === 'op') {
        const n = ver(1) && ver(1).t === 'num' ? ver(1).v : 2;
        throw new ErrorMates(esSigno(sig)
          ? `Hay dos signos seguidos («${op}${sig.v}»). Un número con signo se escribe entre paréntesis: por ejemplo, 3 ${op} (${sig.v}${n}).`
          : `Hay dos signos seguidos: falta un número antes de «${sig.v}».`, sig.pos);
      }
      if (sig.t === 'exp') throw new ErrorMates('El exponente va detrás de un número o de un paréntesis.', sig.pos);
    }

    function expr(ctx) {
      const terms = [];
      let s = null;
      if (esSigno(ver())) { s = toks[p++].v; trasSigno(s); }
      // Número negativo al principio: −4 (pero −3² es −(3²): el signo queda fuera)
      if (s === '−' && ver().t === 'num' && !(ver(1) && ver(1).t === 'exp')) {
        const f = { t: 'num', v: limpio(-toks[p++].v) };
        comprobarSiguiente(f);
        terms.push(term(ctx, null, f));
      } else terms.push(term(ctx, s));
      while (esSigno(ver())) {
        const op = toks[p++].v;
        trasSigno(op);
        terms.push(term(ctx, op));
      }
      return { t: 'expr', terms };
    }

    function term(ctx, s, f0) {
      const fs = [f0 || factor(ctx)], ops = [];
      while (!fin() && ver().t === 'op' && (ver().v === '·' || ver().v === ':')) {
        const op = toks[p++].v;
        const sig = ver();
        if (!sig) throw new ErrorMates(`Falta un número después de «${op}».`, toks[p - 1].pos);
        if (sig.t === 'op') {
          const n = ver(1) && ver(1).t === 'num' ? ver(1).v : 2;
          throw new ErrorMates(esSigno(sig)
            ? `Detrás de «${op}» un número con signo va entre paréntesis: por ejemplo, 3 ${op} (${sig.v}${n}).`
            : `Hay dos signos seguidos: falta un número antes de «${sig.v}».`, sig.pos);
        }
        ops.push(op);
        fs.push(factor(ctx));
      }
      return { t: 'term', s, fs, ops };
    }

    function factor(ctx) {
      const tok = ver();
      if (!tok) throw new ErrorMates('La operación está incompleta.', src.length);
      let f;
      if (tok.t === 'num') {
        p++;
        f = { t: 'num', v: tok.v };
      } else if (tok.t === 'raiz') {
        f = raiz(ctx);
      } else if (tok.t === 'abre') {
        f = grupoOEnvoltorio(ctx);
      } else if (tok.t === 'op') {
        throw new ErrorMates(`Hay dos signos seguidos: falta un número antes de «${tok.v}».`, tok.pos);
      } else if (tok.t === 'exp') {
        throw new ErrorMates('El exponente va detrás de un número o de un paréntesis.', tok.pos);
      } else {
        throw new ErrorMates(`Sobra «${tok.v}»: no hay nada que cerrar.`, tok.pos);
      }
      if (ver() && ver().t === 'exp') {
        const e = toks[p];
        if (f.t === 'raiz')
          throw new ErrorMates('Para elevar una raíz a un exponente, ponla entre paréntesis: (√9)².', e.pos);
        if (e.v > MAX_EXP) throw new ErrorMates(`El exponente ${e.v} es demasiado grande (máximo ${MAX_EXP}).`, e.pos);
        p++;
        f = { t: 'pot', b: f, n: e.v };
        if (ver() && ver().t === 'exp') throw new ErrorMates('Hay dos exponentes seguidos.', ver().pos);
      }
      comprobarSiguiente(f);
      return f;
    }

    // Detrás de un factor debe venir un signo, un cierre o el final.
    function comprobarSiguiente(f) {
      const sig = ver();
      if (sig && (sig.t === 'num' || sig.t === 'abre' || sig.t === 'raiz'))
        throw new ErrorMates(`Falta un signo entre ${describirFactor(f)} y ${describir(sig)}. Para multiplicar hay que escribir «·».`, sig.pos);
    }

    function raiz(ctx) {
      const tr = toks[p++];
      const r = ver();
      if (!r) throw new ErrorMates('Falta el número de dentro de la raíz.', tr.pos);
      if (esSigno(r) && r.v === '−')
        throw new ErrorMates('No existe la raíz cuadrada de un número negativo: ningún número multiplicado por sí mismo da negativo.', r.pos);
      if (r.t === 'num') { p++; return { t: 'raiz', a: { t: 'num', v: r.v } }; }
      if (r.t === 'abre' && r.v === '(') {
        if (esSigno(ver(1)) && ver(2) && ver(2).t === 'num' && ver(3) && ver(3).t === 'cierra') {
          if (ver(1).v === '−')
            throw new ErrorMates('No existe la raíz cuadrada de un número negativo: ningún número multiplicado por sí mismo da negativo.', r.pos);
          throw new ErrorMates(`Sobra el paréntesis: escribe √${ver(2).v}.`, r.pos);
        }
        return { t: 'raiz', a: grupo(ctx, true) };
      }
      throw new ErrorMates('Detrás de «√» va un número o un paréntesis: √25 o √(9 + 16).', r.pos);
    }

    function grupoOEnvoltorio(ctx) {
      const ab = ver();
      // (−8) o (+5): un número con signo
      if (esSigno(ver(1)) && ver(2) && ver(2).t === 'num' && ver(3) && ver(3).t === 'cierra') {
        const signo = ver(1).v, n = ver(2).v, c = ver(3);
        if (ab.v !== '(')
          throw new ErrorMates(`Un número con signo se escribe entre paréntesis, (${signo}${n}), no entre ${ab.v === '[' ? 'corchetes' : 'llaves'}.`, ab.pos);
        if (c.v !== ')')
          throw new ErrorMates(`El paréntesis que se abre con «(» debe cerrarse con «)», no con «${c.v}».`, c.pos);
        p += 4;
        return { t: 'num', v: limpio(signo === '−' ? -n : n), par: true, mas: signo === '+' };
      }
      return grupo(ctx, false);
    }

    function comprobarAnidamiento(ctx, ab) {
      const k = ab.v;
      if (ctx === '(') {
        if (k === '(') throw new ErrorMates('Dentro de un paréntesis no puede ir otro paréntesis: el de fuera debe ser un corchete [ ].', ab.pos);
        if (k === '[') throw new ErrorMates('Un corchete no puede ir dentro de un paréntesis: el corchete va por fuera.', ab.pos);
        throw new ErrorMates('Una llave no puede ir dentro de un paréntesis: la llave va por fuera.', ab.pos);
      }
      if (ctx === '[') {
        if (k === '[') throw new ErrorMates('Dentro de un corchete no puede ir otro corchete: el de fuera debe ser una llave { }.', ab.pos);
        if (k === '{') throw new ErrorMates('Una llave no puede ir dentro de un corchete: la llave va por fuera.', ab.pos);
      }
      if (ctx === '{' && k === '{') throw new ErrorMates('Dentro de una llave no puede ir otra llave.', ab.pos);
    }

    function grupo(ctx, comoRaiz) {
      const ab = toks[p];
      const k = comoRaiz ? '√' : ab.v;
      if (!comoRaiz) comprobarAnidamiento(ctx, ab);
      p++;
      if (!fin() && ver().t === 'cierra')
        throw new ErrorMates(comoRaiz ? 'La raíz está vacía.' : `${mayus(EL[k])} está ${k === '{' ? 'vacía' : 'vacío'}.`, ab.pos);
      const e = expr(k);
      const c = ver();
      const cierre = CIERRE[ab.v];
      const quien = comoRaiz ? 'el paréntesis de la raíz' : EL[k];
      if (!c || c.t !== 'cierra')
        throw new ErrorMates(`Falta cerrar ${quien} con «${cierre}».`, c ? c.pos : src.length);
      if (c.v !== cierre)
        throw new ErrorMates(`${mayus(quien)} que se abre con «${ab.v}» debe cerrarse con «${cierre}», no con «${c.v}».`, c.pos);
      p++;
      const t0 = e.terms[0];
      if (e.terms.length === 1 && t0.fs.length === 1 && !t0.s) {
        const solo = t0.fs[0];
        if (solo.t === 'num') {
          if (comoRaiz) throw new ErrorMates(`Sobra el paréntesis: escribe √${fmt(solo.v)}.`, ab.pos);
          if (solo.par) throw new ErrorMates(`${mayus(EL[k])} solo contiene el número (${fmt(solo.v)}): sobra.`, ab.pos);
          if (solo.v < 0) throw new ErrorMates(`Un número con signo se escribe entre paréntesis: (${fmt(solo.v)}).`, ab.pos);
          throw new ErrorMates(`${mayus(EL[k])} «${ab.v}${solo.v}${cierre}» solo tiene un número: sobra.`, ab.pos);
        }
        if (solo.t === 'grp') throw new ErrorMates(`${mayus(EL[k])} solo contiene ${EL[solo.k]}: sobra uno de los dos.`, ab.pos);
      }
      return { t: 'grp', k, e };
    }

    const raizArbol = expr(null);
    if (!fin()) {
      const tok = ver();
      if (tok.t === 'cierra') throw new ErrorMates(`Sobra «${tok.v}»: no hay nada que cerrar.`, tok.pos);
      throw new ErrorMates(`No entiendo lo que hay a partir de ${describir(tok)}.`, tok.pos);
    }
    return raizArbol;
  }

  /* ---------- Utilidades ---------- */
  const factoresTexto = t => t.fs.map((f, i) => (i ? ` ${t.ops[i - 1]} ` : '') + texto(f)).join('');
  function texto(n) {           // texto plano de un nodo
    switch (n.t) {
      case 'num': {
        const s = (n.mas && n.v >= 0 ? '+' : '') + fmt(n.v);
        return n.par ? `(${s})` : s;
      }
      case 'grp': return n.k === '√' ? `(${texto(n.e)})` : n.k + texto(n.e) + CIERRE[n.k];
      case 'pot': return texto(n.b) + sup(n.n);
      case 'raiz': return '√' + texto(n.a);
      case 'term': return (n.s || '') + factoresTexto(n);
      case 'expr': return n.terms.map((t, i) => (i ? ` ${t.s} ` : (t.s || '')) + factoresTexto(t)).join('');
    }
  }

  function seguro(v, desc) {
    if (!Number.isSafeInteger(v)) throw new ErrorMates(`El resultado de ${desc} es demasiado grande.`);
    return limpio(v);
  }

  function grupos(n, out = []) {
    switch (n.t) {
      case 'expr': n.terms.forEach(t => grupos(t, out)); break;
      case 'term': n.fs.forEach(f => grupos(f, out)); break;
      case 'grp': out.push(n); grupos(n.e, out); break;
      case 'pot': grupos(n.b, out); break;
      case 'raiz': grupos(n.a, out); break;
    }
    return out;
  }
  // ¿Es ya un número terminado? (sin signo pendiente ni paréntesis)
  const esFinal = e => e.terms.length === 1 && e.terms[0].fs.length === 1 &&
    e.terms[0].fs[0].t === 'num' && !e.terms[0].fs[0].par && e.terms[0].s !== '−';

  // Copia el árbol aplicando sustituciones (Map nodo → nodo nuevo)
  function copiar(n, sust) {
    if (sust.has(n)) return sust.get(n);
    switch (n.t) {
      case 'num': { const c = { t: 'num', v: n.v }; if (n.par) c.par = true; if (n.mas) c.mas = true; return c; }
      case 'grp': return { t: 'grp', k: n.k, e: copiar(n.e, sust) };
      case 'pot': return { t: 'pot', b: copiar(n.b, sust), n: n.n };
      case 'raiz': return { t: 'raiz', a: copiar(n.a, sust) };
      case 'term': return { t: 'term', s: n.s, fs: n.fs.map(f => copiar(f, sust)), ops: n.ops.slice() };
      case 'expr': return { t: 'expr', terms: n.terms.map(t => copiar(t, sust)) };
    }
  }

  /* Coloca los resultados nuevos en su sitio, con la notación correcta:
     − un negativo detrás de un signo, o como factor de una cadena, va entre
       paréntesis: 4 · (−5), 9 − (−20), (−10) : (−2);
     − al principio, si es un término suelto, va sin paréntesis: −6 + 18;
     − el signo − de delante de un número positivo se une a él: −(7) → −7.  */
  function normalizar(e) {
    e.terms.forEach((t, i) => {
      t.fs.forEach(f => {
        if (f.t === 'grp') normalizar(f.e);
        else if (f.t === 'pot') {
          if (f.b.t === 'grp') normalizar(f.b.e);
          else if (f.b.nuevo) f.b.par = f.b.v < 0;
        } else if (f.t === 'raiz' && f.a.t === 'grp') normalizar(f.a.e);
      });
      // −(3 + 4) → −7: el signo de fuera no se ha tocado; se une al número
      // (la pizarra lo deja en blanco y solo colorea el 7)
      const f0 = t.fs[0];
      if (i === 0 && t.s === '−' && f0.t === 'num' && f0.nuevo && f0.v >= 0) {
        f0.v = limpio(-f0.v);
        f0.absorbe = true;
        t.s = null;
      }
      t.fs.forEach((f, j) => {
        if (f.t === 'num' && f.nuevo && !f.absorbe)
          f.par = f.v < 0 && (i > 0 || j > 0 || !!t.s || t.fs.length > 1);
      });
    });
    return e;
  }

  /* ---------- Cálculos con su explicación ---------- */
  function cadenaMul(t) {       // · y : de izquierda a derecha
    let v = t.fs[0].v;
    const parciales = [], signos = [];
    for (let i = 1; i < t.fs.length; i++) {
      const f = t.fs[i].v, op = t.ops[i - 1];
      let r;
      if (op === '·') r = seguro(v * f, `${fmtP(v)} · ${fmtP(f)}`);
      else {
        if (f === 0) throw new ErrorMates(`No se puede dividir entre 0 (${fmtP(v)} : 0).`);
        if (v % f !== 0) throw new ErrorMates(`La división ${fmtP(v)} : ${fmtP(f)} no es exacta: el resultado no sería un número entero.`);
        r = limpio(v / f);
      }
      const conSigno = v < 0 || f < 0;
      parciales.push(`${fmtP(v)} ${op} ${fmtP(f)} = ${conSigno ? fmtS(r) : fmt(r)}`);
      if (v !== 0 && f !== 0) signos.push((v < 0) === (f < 0) ? 'iguales' : 'distintos');
      v = r;
    }
    return { v, parciales, signos };
  }

  function cadenaSuma(e) {      // + y − de izquierda a derecha
    const t0 = e.terms[0];
    let v = (t0.s === '−' ? -1 : 1) * t0.fs[0].v;
    const parciales = [], signos = [];
    for (let i = 1; i < e.terms.length; i++) {
      const t = e.terms[i], n = t.fs[0].v;
      const b = t.s === '−' ? -n : n;
      const r = seguro(v + b, `${fmt(v)} ${t.s} ${n}`);
      parciales.push(`${fmt(v)} ${t.s} ${n} = ${fmt(r)}`);
      if (v !== 0 && b !== 0) signos.push((v < 0) === (b < 0) ? 'mismo' : 'distinto');
      v = r;
    }
    return { v: limpio(v), parciales, signos };
  }

  function potencia(f) {
    const b = f.b.v, n = f.n;
    if (n === 0 && b === 0) throw new ErrorMates('0⁰ no tiene valor: el exponente 0 necesita una base distinta de 0.');
    let v = 1;
    const signos = [];
    for (let i = 0; i < n; i++) {
      if (i > 0 && v !== 0 && b !== 0) signos.push((v < 0) === (b < 0) ? 'iguales' : 'distintos');
      v = seguro(v * b, texto(f));
    }
    const base = fmtP(b);
    const res = b < 0 ? fmtS(v) : fmt(v);
    const detalle = n >= 2 && n <= 5
      ? `${texto(f)} = ${Array(n).fill(base).join(' · ')} = ${res}`
      : `${texto(f)} = ${res}`;
    return { v: limpio(v), detalle, signos };
  }

  function raizCuadrada(f) {
    const a = f.a.v;
    if (a < 0) throw new ErrorMates(`No existe la raíz cuadrada de ${fmt(a)}: ningún número multiplicado por sí mismo da negativo.`);
    const r = Math.round(Math.sqrt(a));
    if (r * r !== a) throw new ErrorMates(`La raíz √${a} no es exacta: ningún número entero multiplicado por sí mismo da ${a}.`);
    return { v: r, detalle: `√${a} = ${r}, porque ${r} · ${r} = ${a}`, signos: [] };
  }

  /* ---------- Un paso ----------
     Marca lo que se opera en `raiz` (.caja… = id) y devuelve la línea
     siguiente, donde los resultados llevan .res = id.
       grp.caja  → se recuadra el grupo entero (desaparece)
       term.cajaT → signo + término (dos signos seguidos)
       term.cajaF → solo los factores (multiplicación: el signo no se toca)
       pot/raiz.caja, expr.caja                                            */
  const NIVELES = ['signo', 'pot', 'mul', 'suma'];
  const candidatos = {
    signo: o => {
      const ts = o.e.terms;
      const c = ts.filter(t => t.fs.length === 1 && t.fs[0].t === 'num' && t.fs[0].par);
      // Un grupo que se ha quedado con un solo número, como [−7]
      if (o.g && ts.length === 1 && ts[0].fs.length === 1 && ts[0].fs[0].t === 'num' && !ts[0].fs[0].par && ts[0].s !== '−')
        c.push(ts[0]);
      return c;
    },
    pot: o => o.e.terms.flatMap(t => t.fs.filter(f => f.t === 'pot' || f.t === 'raiz')),
    mul: o => o.e.terms.filter(t => t.fs.length > 1),
    suma: o => (o.e.terms.length > 1 ? [o.e] : []),
  };

  function paso(raiz, nPaso) {
    const todos = grupos(raiz);
    const ambito = todos.length ? 'grupo' : 'global';
    const objetivos = ambito === 'grupo'
      ? todos.filter(g => grupos(g.e).length === 0).map(g => ({ e: g.e, g }))
      : [{ e: raiz, g: null }];
    const nivel = NIVELES.find(nv => objetivos.some(o => candidatos[nv](o).length));
    if (!nivel) throw new ErrorMates('Error interno: no hay nada que hacer en este paso.');

    const sust = new Map();
    const ops = [];
    let k = 0;
    const nuevoId = () => `${nPaso}-${k++}`;
    const num = (v, id) => ({ t: 'num', v: limpio(v), res: id, nuevo: true });

    for (const o of objetivos) {
      const lista = candidatos[nivel](o);
      if (!lista.length) continue;
      const unico = !!o.g && o.e.terms.length === 1;   // el grupo puede desaparecer
      const base = { g: o.g, grupo: o.g ? o.g.k : null };

      if (nivel === 'signo') {
        for (const t of lista) {
          const id = nuevoId();
          const w = t.fs[0];
          if (!w.par) {             // [−7]: el grupo solo tiene un número
            o.g.caja = id;
            sust.set(o.g, num(w.v, id));
            ops.push({ ...base, id, nivel, tipo: 'solo', nodo: o.g, recuadro: texto(o.g), antes: texto(o.g), despues: fmt(w.v), v: w.v, signos: [], desaparece: true });
            continue;
          }
          const i = o.e.terms.indexOf(t);
          const v = limpio(t.s === '−' ? -w.v : w.v);
          const signos = [(t.s || '+') + (w.v < 0 ? '−' : '+')];
          const op = { ...base, id, nivel, tipo: 'signo', antes: (t.s || '') + texto(w), despues: fmtS(v), v, conSigno: !!t.s, signos };
          if (unico) {
            o.g.caja = id; sust.set(o.g, num(v, id));
            Object.assign(op, { nodo: o.g, recuadro: texto(o.g), desaparece: true });
          } else {
            t.cajaT = id;
            sust.set(t, i === 0
              ? { t: 'term', s: null, fs: [num(v, id)], ops: [] }
              : { t: 'term', s: v < 0 ? '−' : '+', fs: [num(Math.abs(v), id)], ops: [], resSigno: id });
            Object.assign(op, { nodo: t, recuadro: op.antes, desaparece: false });
          }
          ops.push(op);
        }
      } else if (nivel === 'pot') {
        for (const f of lista) {
          const id = nuevoId();
          const c = f.t === 'pot' ? potencia(f) : raizCuadrada(f);
          const t0 = o.e.terms[0];
          const desaparece = unico && t0.fs.length === 1 && t0.fs[0] === f && !t0.s;
          const nodo = desaparece ? o.g : f;
          nodo.caja = id;
          sust.set(nodo, num(c.v, id));
          ops.push({ ...base, id, nivel, tipo: f.t, nodo, recuadro: texto(nodo), antes: texto(f), v: c.v, detalle: c.detalle, signos: c.signos, desaparece });
        }
      } else if (nivel === 'mul') {
        for (const t of lista) {
          const id = nuevoId();
          const c = cadenaMul(t);
          const desaparece = unico && t.s !== '−';
          if (desaparece) { o.g.caja = id; sust.set(o.g, num(c.v, id)); }
          else { t.cajaF = id; sust.set(t, { t: 'term', s: t.s, fs: [num(c.v, id)], ops: [] }); }
          ops.push({ ...base, id, nivel, nodo: desaparece ? o.g : t, recuadro: desaparece ? texto(o.g) : factoresTexto(t), antes: factoresTexto(t), v: c.v,
                     simbolos: t.ops.slice(), parciales: c.parciales, signos: c.signos, desaparece });
        }
      } else {
        const e = o.e, id = nuevoId();
        const c = cadenaSuma(e);
        if (o.g) { o.g.caja = id; sust.set(o.g, num(c.v, id)); }
        else { e.caja = id; sust.set(e, { t: 'expr', terms: [{ t: 'term', s: null, fs: [num(c.v, id)], ops: [] }] }); }
        ops.push({ ...base, id, nivel, nodo: o.g || e, recuadro: texto(o.g || e), antes: texto(e), v: c.v,
                   simbolos: e.terms.slice(1).map(t => t.s), parciales: c.parciales, signos: c.signos, desaparece: !!o.g });
      }
    }
    if (!ops.length) throw new ErrorMates('Error interno: no hay nada que hacer en este paso.');
    const siguiente = normalizar(copiar(raiz, sust));
    const signos = [...new Set(ops.flatMap(o => o.signos))];
    return { ambito, nivel, ops, siguiente, signos, completo: esFinal(siguiente) };
  }

  /* ---------- Explicación de cada paso ---------- */
  function lista(xs) {
    return xs.length === 1 ? xs[0] : xs.slice(0, -1).join(', ') + ' y ' + xs[xs.length - 1];
  }
  // «Dentro del corchete», «Dentro de los paréntesis y de la raíz»…
  function dentro(p) {
    const cuenta = new Map();
    for (const o of p.ops) {
      if (!cuenta.has(o.grupo)) cuenta.set(o.grupo, new Set());
      cuenta.get(o.grupo).add(o.g);
    }
    const orden = ['(', '[', '{', '√'].filter(k => cuenta.has(k));
    return 'Dentro ' + lista(orden.map(k => (cuenta.get(k).size > 1 ? DELOS[k] : DEL[k])));
  }
  function nombreOperacion(nivel, simbolos) {
    const set = new Set(simbolos);
    const plural = simbolos.length > 1;
    if (nivel === 'mul') {
      if (set.size > 1) return 'multiplicaciones y divisiones, de izquierda a derecha';
      return set.has('·') ? (plural ? 'las multiplicaciones' : 'la multiplicación')
                          : (plural ? 'las divisiones' : 'la división');
    }
    if (set.size > 1) return 'sumas y restas, de izquierda a derecha';
    return set.has('+') ? (plural ? 'las sumas' : 'la suma')
                        : (plural ? 'las restas' : 'la resta');
  }
  function nombrePot(ops) {
    const pots = ops.filter(o => o.tipo === 'pot').length, raices = ops.length - pots;
    if (pots && raices) return 'potencias y raíces';
    if (pots) return pots > 1 ? 'las potencias' : 'la potencia';
    return raices > 1 ? 'las raíces' : 'la raíz';
  }
  // Cálculo de una cadena: «5 − 22 = −17; −17 + 4 = −13»
  const calculo = (o, varios) => {
    if (o.parciales.length === 1) return o.parciales[0];
    return (varios ? o.antes + ': ' : '') + o.parciales.join('; ');
  };
  const unir = (xs, conPuntoYComa) => (conPuntoYComa ? xs.join('; ') : lista(xs));

  function explicar(p, habiaGrupos, primerGlobal, primerPaso) {
    const resto = p.completo ? '' : ' Lo demás no se toca.';
    const enGrupo = p.ambito === 'grupo';
    const intro = !enGrupo && habiaGrupos && primerGlobal ? 'Ya no quedan operaciones entre paréntesis. ' : '';
    // «Dentro del corchete, …» o, fuera de los paréntesis, «Primero, …» / «Ahora, …»
    const lugar = enGrupo ? dentro(p) + ', ' : (primerPaso ? 'Primero, ' : 'Ahora, ');

    if (p.nivel === 'signo') {
      const solos = p.ops.filter(o => o.tipo === 'solo');
      const signos = p.ops.filter(o => o.tipo === 'signo');
      const partes = [];
      if (signos.length) {
        const items = lista(signos.map(o => `${o.antes} = ${o.despues}`));
        const algunoConSigno = signos.some(o => o.conSigno);
        partes.push(lugar + (algunoConSigno
          ? `quitamos paréntesis: dos signos seguidos se convierten en uno. ${items}.`
          : `quitamos ${signos.length > 1 ? 'los paréntesis de los números' : 'el paréntesis del número'}: ${items}.`));
      }
      if (solos.length) {
        const k = solos[0].grupo;
        partes.push(mayus(`${solos.length > 1 ? LOS[k] + ' se quedan' : EL[k] + ' se queda'} con un solo número y ${solos.length > 1 ? 'desaparecen' : 'desaparece'}: ${lista(solos.map(o => `${o.antes} = ${o.despues}`))}.`));
      }
      return intro + partes.join(' ') + resto;
    }
    if (p.nivel === 'pot') {
      const que = nombrePot(p.ops);
      const items = unir(p.ops.map(o => o.detalle), p.ops.length > 1);
      return `${intro}${lugar}${que}: ${items}.${resto}`;
    }
    if (p.nivel === 'mul') {
      const que = nombreOperacion('mul', p.ops.flatMap(o => o.simbolos));
      const cadenas = p.ops.some(o => o.parciales.length > 1);
      const items = unir(p.ops.map(o => calculo(o, p.ops.length > 1)), cadenas);
      return `${intro}${lugar}${que}: ${items}.${resto}`;
    }
    // Sumas y restas
    const simbolos = p.ops.flatMap(o => o.simbolos);
    const que = nombreOperacion('suma', simbolos);
    const items = unir(p.ops.map(o => calculo(o, p.ops.length > 1)), p.ops.some(o => o.parciales.length > 1));
    if (enGrupo) {
      const ks = new Set(p.ops.map(o => o.grupo));
      const varios = p.ops.length > 1;
      const donde = ks.size > 1 ? 'los paréntesis, corchetes y llaves más internos'
                  : varios ? LOS[[...ks][0]] : EL[[...ks][0]];
      const izq = simbolos.length > p.ops.length ? ', de izquierda a derecha' : '';
      if ([...ks].every(k => k === '√'))
        return `Dentro ${varios ? 'de las raíces' : 'de la raíz'}, ${que}: ${items}.${resto}`;
      return `${varios ? 'Se resuelven' : 'Se resuelve'} ${donde}${izq}: ${items}.${resto}`;
    }
    if (p.completo && primerPaso) return `${mayus(que)}: ${items}.`;
    return `${intro}Por último, ${que}: ${items}.`;
  }

  /* ---------- Resolución completa ---------- */
  function resolver(src) {
    const raiz = analizar(src);
    const t0 = raiz.terms[0];
    if (raiz.terms.length === 1 && t0.fs.length === 1 && t0.fs[0].t === 'num' && t0.s !== '−')
      throw new ErrorMates('Escribe una operación: solo hay un número.');
    const habiaGrupos = grupos(raiz).length > 0;
    const lineas = [raiz];
    const pasos = [];
    let actual = raiz;
    let primerGlobal = true;
    while (!esFinal(actual)) {
      if (pasos.length >= MAX_PASOS) throw new ErrorMates('La operación tiene demasiados pasos.');
      const p = paso(actual, pasos.length);
      p.texto = explicar(p, habiaGrupos, primerGlobal && p.ambito === 'global', pasos.length === 0);
      if (p.ambito === 'global') primerGlobal = false;
      pasos.push(p);
      actual = p.siguiente;
      lineas.push(actual);
    }
    return { lineas, pasos, resultado: actual.terms[0].fs[0].v };
  }

  return { resolver, analizar, texto, fmt, ErrorMates, NOMBRE, CIERRE };
})();

if (typeof module !== 'undefined') module.exports = Motor;
