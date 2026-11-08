# Operaciones combinadas con números enteros

App hermana de [Operaciones combinadas](https://github.com/YowahEsp/Operaciones_combinadas): el mismo método de clase del CEPA Tetuán, ahora con números enteros (tema 7, Enseñanzas Iniciales II):

> En cada paso se hace la operación u operaciones que tienen prioridad, y las demás no se tocan.

**Abrir la app:** https://yowahesp.github.io/Operaciones_combinadas_enteros/

## Cómo trabaja

1. Mientras haya paréntesis, corchetes, llaves o raíces con operaciones dentro, solo se trabaja dentro de los más internos. Lo de fuera no se toca. Un paréntesis que solo envuelve un número, como `(−8)`, no es una operación pendiente: es la forma de escribir un número con signo.
2. Entre todos esos, se hace el nivel más alto que haya, y solo ese:
   1. **Quitar paréntesis:** dos signos seguidos se convierten en uno, `−(−8) = +8`. Va con el 1.º de la jerarquía, como en el ejemplo resuelto del libro («Paréntesis interior: −(−8) = +8»).
   2. Potencias y raíces.
   3. Multiplicaciones y divisiones.
   4. Sumas y restas.
3. Una cadena del mismo nivel se resuelve en un solo paso, de izquierda a derecha. La explicación muestra los cálculos parciales: `5 − 22 = −17; −17 + 4 = −13`.
4. Si un paréntesis, corchete o llave queda en un solo número, desaparece en ese mismo paso. Si el número es negativo y va detrás de un signo, se escribe entre paréntesis: `4 · (3 − 8)` → `4 · (−5)`.
5. El signo de delante de una multiplicación no se toca hasta su turno: `9 − 4 · (−5)` → `9 − (−20)` → `9 + 20`.
6. `−3²` es `−(3²) = −9`; `(−3)² = 9`. Las raíces son cuadradas y exactas; la de un número negativo no existe y la app lo explica.

Cada paso tiene su color: lo que se opera se recuadra, una flecha lleva al resultado y el resultado se escribe en ese color. En la pizarra se encienden el nivel de la jerarquía y la regla de los signos que se usa en cada paso (el «Recuerda» del tema).

Incluye todos los ejercicios de operaciones combinadas del tema 7 (apartado 7, los 32 de cálculo y los 8 con potencias y raíces), y se puede escribir cualquier otra operación.

## Archivos

- `index.html`: la app completa en un solo archivo, sin dependencias externas. Es lo que publica GitHub Pages.
- `motor.js`: el motor que calcula los pasos.
- `plantilla.html`: la interfaz.
- `ejercicios.js`: los ejercicios del tema 7 con la solución del libro.
- `construir.py`: monta `index.html` a partir de la plantilla, los ejercicios, el motor y la fuente (`python3 construir.py`).
- `pruebas.js`: pruebas del motor (`node pruebas.js`): todos los ejercicios del tema contra la solución del libro, el método paso a paso y los mensajes de error.
- `fuentes/`: fuente Andika, de SIL International, bajo la licencia SIL Open Font License 1.1 (`fuentes/OFL.txt`).
