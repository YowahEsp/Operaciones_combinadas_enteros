const M = require('./motor.js');
const TEMA = require('./ejercicios.js');
let fallos = 0, total = 0;
const plano = s => s.replace(/\s+/g, '');

function lineas(src) { return M.resolver(src).lineas.map(l => plano(M.texto(l))); }
function cajas(src) {   // por paso: textos de lo recuadrado
  return M.resolver(src).pasos.map(p => p.ops.map(o => plano(o.recuadro)));
}
function igual(nombre, a, b) {
  total++;
  const ok = JSON.stringify(a) === JSON.stringify(b);
  if (!ok) { fallos++; console.log('✗', nombre, '\n   obtenido:', JSON.stringify(a), '\n   esperado:', JSON.stringify(b)); }
  else console.log('✓', nombre);
}
function error(nombre, src, trozo) {
  total++;
  try { M.resolver(src); fallos++; console.log('✗', nombre, '— no dio error'); }
  catch (e) {
    if (!(e instanceof M.ErrorMates) || !e.message.includes(trozo)) { fallos++; console.log('✗', nombre, '—', e.message); }
    else console.log('✓', nombre, '→', e.message);
  }
}

/* ---- Tema 7: todos los ejercicios dan la solución del libro ---- */
for (const g of TEMA) for (const [n, op, sol] of g.items)
  igual(`${g.grupo} ${n}: ${op} = ${sol}`, M.resolver(op).resultado, sol);

/* ---- El ejemplo resuelto del libro, paso a paso ---- */
const ej = '5 − 2 · [3 − (−8)] + 4';
igual('ejemplo del libro: líneas', lineas(ej), ['5−2·[3−(−8)]+4', '5−2·[3+8]+4', '5−2·11+4', '5−22+4', '−13']);
igual('ejemplo del libro: recuadros', cajas(ej), [['−(−8)'], ['[3+8]'], ['2·11'], ['5−22+4']]);

/* ---- Método ---- */
// El signo de delante de la multiplicación no se toca hasta su turno
igual('9 − 4·(3−8)', lineas('9 − 4 · (3 − 8)'), ['9−4·(3−8)', '9−4·(−5)', '9−(−20)', '9+20', '29']);
igual('9 − 4·(3−8): recuadros', cajas('9 − 4 · (3 − 8)'), [['(3−8)'], ['4·(−5)'], ['−(−20)'], ['9+20']]);
igual('18:(−3) + 5·(−2)', lineas('18 : (−3) + 5 · (−2)'), ['18:(−3)+5·(−2)', '−6+(−10)', '−6−10', '−16']);
// Lo de fuera espera, aunque sea quitar un paréntesis
igual('(−6) espera', lineas('(−6) + 3 · [2 − (−4)]'), ['(−6)+3·[2−(−4)]', '(−6)+3·[2+4]', '(−6)+3·6', '−6+3·6', '−6+18', '12']);
// Un grupo que queda en negativo: con paréntesis si va detrás de un signo o es factor
igual('[−6+(−4)]:(−2)−5', lineas('[−6 + (−4)] : (−2) − 5'), ['[−6+(−4)]:(−2)−5', '[−6−4]:(−2)−5', '(−10):(−2)−5', '5−5', '0']);
igual('−(5−8)', lineas('−(5 − 8) + 2 · (−3)'), ['−(5−8)+2·(−3)', '−(−3)+2·(−3)', '3+2·(−3)', '3+(−6)', '3−6', '−3']);
igual('−(3+4)·(−2)', lineas('−(3 + 4) · (−2) − 8'), ['−(3+4)·(−2)−8', '−7·(−2)−8', '14−8', '6']);
igual('−(5−8)·2', lineas('−(5 − 8) · 2'), ['−(5−8)·2', '−(−3)·2', '−(−6)', '6']);
igual('−[4+2·(−3)]−1', lineas('−[4 + 2 · (−3)] − 1'), ['−[4+2·(−3)]−1', '−[4+(−6)]−1', '−[4−6]−1', '−(−2)−1', '2−1', '1']);
// Cadenas en un solo paso
igual('cadena de sumas', lineas('−5 + 8 − 3 + 6 − 12'), ['−5+8−3+6−12', '−6']);
igual('cadena de productos', lineas('(−2) · (−3) · (−1)'), ['(−2)·(−3)·(−1)', '−6']);
// Potencias y raíces
igual('−3² es −(3²)', lineas('−3² + 10'), ['−3²+10', '−9+10', '1']);
igual('(−3)²', lineas('(−3)² + 10'), ['(−3)²+10', '9+10', '19']);
igual('(2−5)²', lineas('(2 − 5)² − 1'), ['(2−5)²−1', '(−3)²−1', '9−1', '8']);
igual('−(−3)³', lineas('−(−3)³ + 2² · [−5 + (−1)²] − √9'),
  ['−(−3)³+2²·[−5+(−1)²]−√9', '−(−3)³+2²·[−5+1]−√9', '−(−3)³+2²·(−4)−√9', '−(−27)+4·(−4)−3', '27+4·(−4)−3', '27+(−16)−3', '27−16−3', '8']);
igual('raíz de una operación', lineas('√(9 + 16) − 1'), ['√(9+16)−1', '√25−1', '5−1', '4']);
igual('−√9', lineas('−√9 + 5'), ['−√9+5', '−3+5', '2']);
igual('signo + escrito', lineas('(+8) − (−2)'), ['(+8)−(−2)', '8+2', '10']);
igual('+6 + 9', lineas('+6 + 9'), ['+6+9', '15']);
// Llaves
igual('llaves', lineas('{12 − [3 + (−5)]²} : (−4) + √49'),
  ['{12−[3+(−5)]²}:(−4)+√49', '{12−[3−5]²}:(−4)+√49', '{12−(−2)²}:(−4)+√49', '{12−4}:(−4)+√49', '8:(−4)+√49', '8:(−4)+7', '−2+7', '5']);
// Un corchete que se queda con un número
igual('[−(3+4)]·2', lineas('[−(3 + 4)] · 2'), ['[−(3+4)]·2', '[−7]·2', '(−7)·2', '−14']);
// Quitar paréntesis (signos seguidos) no hace esperar a los demás paréntesis
igual('signos y otro paréntesis en el mismo paso', lineas('(5 − (−3)) · 2 + (4 + 2 · 3)'),
  ['(5−(−3))·2+(4+2·3)', '(5+3)·2+(4+6)', '8·2+10', '16+10', '26']);
igual('signos y paréntesis limpio en el mismo paso', lineas('3−[8−(−2)+7·15+(−4)]+7·(2−9)'),
  ['3−[8−(−2)+7·15+(−4)]+7·(2−9)', '3−[8+2+7·15−4]+7·(−7)', '3−[8+2+105−4]+7·(−7)', '3−111+7·(−7)', '3−111+(−49)', '3−111−49', '−157']);
// Entre paréntesis limpios, solo el nivel más alto (como en naturales)
igual('prioridad entre grupos limpios', lineas('(2 + 3 · 4) − (9 − 5)'), ['(2+3·4)−(9−5)', '(2+12)−(9−5)', '14−4', '10']);
// Signos alternativos al escribir
igual('signos del teclado', lineas('9 - 4*(3-8)'), lineas('9 − 4 · (3 − 8)'));
igual('potencia con ^', lineas('(-2)^3 + 1'), ['(−2)³+1', '−8+1', '−7']);
igual('raíz escrita', lineas('raiz 25 + 1'), ['√25+1', '5+1', '6']);

/* ---- Errores ---- */
error('dos signos tras ·', '3 · −2', 'entre paréntesis');
error('dos signos seguidos', '3 − −2', 'dos signos seguidos');
error('negativo entre corchetes', '[−3] + 1', 'entre paréntesis');
error('raíz de negativo', '√(−9)', 'No existe');
error('raíz de negativo sin paréntesis', '√−9', 'No existe');
error('raíz que da negativo', '√(5 − 14)', 'No existe');
error('raíz no exacta', '√20 + 1', 'no es exacta');
error('división no exacta', '7 : (−2)', 'no es exacta');
error('división entre cero', '5 : (3 − 3)', 'entre 0');
error('0⁰', '0⁰ + 1', 'no tiene valor');
error('paréntesis dentro de paréntesis', '((1 + 2) · 3)', 'corchete');
error('corchete dentro de corchete', '[[1 + 2] · 3]', 'llave');
error('llave dentro de llave', '{{1 + 2} · 3}', 'otra llave');
error('llave dentro de corchete', '[{1 + 2} · 3]', 'la llave va por fuera');
error('paréntesis de un número', '2 + (3)', 'solo tiene un número');
error('corchete con (−3)', '2 + [(−3)]', 'sobra');
error('corchete con solo un paréntesis', '[(2 + 3)]', 'sobra uno');
error('falta signo', '3(4 + 1)', 'Falta un signo');
error('falta signo con raíz', '2√9', 'Falta un signo');
error('exponente sin número', '2^ + 1', 'exponente');
error('exponente al principio', '²3', 'exponente');
error('raíz con exponente', '√9² + 1', 'entre paréntesis');
error('decimales', '3,5 + 1', 'enteros');
error('vacío', '   ', 'Escribe');
error('solo un número', '−5', 'solo hay un número');
error('solo un número entre paréntesis', '(−5)', 'solo hay un número');
error('mal cerrado', '[2 + 3)', 'debe cerrarse');
error('sin cerrar', '(2 + 3', 'Falta cerrar');
error('sobra cierre', '2 + 3)', 'Sobra');
error('acaba en signo', '3 +', 'Falta un número');
error('letras', '3 + a', 'No entiendo');
error('llave vacía', '2 + {}', 'vacía');

/* ---- Explicaciones ---- */
for (const src of [ej, '9 − 4 · (3 − 8)', '(−6) + 3 · [2 − (−4)]', '√25 − (−3)² · 2 + [15 : (−5)] + 4²', '[−(3 + 4)] · 2', '{12 − [3 + (−5)]²} : (−4) + √49']) {
  console.log('\n' + src);
  M.resolver(src).pasos.forEach((p, i) => console.log(`  Paso ${i + 1} [${p.nivel}${p.signos.length ? ' ' + p.signos.join(',') : ''}]: ${p.texto}`));
}

console.log(`\n${total - fallos}/${total} pruebas correctas`);
process.exit(fallos ? 1 : 0);
