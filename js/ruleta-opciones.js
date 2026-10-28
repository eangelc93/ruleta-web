/**
 * OPCIONES DE LA RULETA
 * ---------------------
 * La ruleta de la carpeta Ruleta lee Opciones de la ruleta.xlsx.
 * Esta lista solo se usa si ese Excel no está.
 * Puedes agregar, quitar, reordenar o renombrar.
 * Con 2 opciones ya funciona. Se lee mejor con 4 a 8.
 *
 * nombre: texto grande al detenerse.
 * rueda:  texto corto dentro de la ruleta. Si lo omites, se usa nombre.
 * detalle: frase de apoyo en el resultado. Opcional.
 * color:  "menta", "cielo", "crema", "azul" o un hex como "#14d4c0".
 * icono:  "bombilla", "grafica", "codigo", "megafono" o "camara". Opcional.
 * peso:   opcional. 1 es normal, 2 sale el doble. 0 la esconde sin borrarla.
 * activa: opcional. false la quita de la ruleta sin borrar el bloque.
 */
export const OPCIONES = [
  {
    nombre: "INNOVACIÓN",
    detalle: "Pensamiento lateral · reto con tarjetas",
    color: "menta",
    icono: "bombilla",
  },
  {
    nombre: "ANALÍTICA DE DATOS",
    rueda: "ANALÍTICA",
    detalle: "Detective de datos · mini dashboard",
    color: "cielo",
    icono: "grafica",
  },
  {
    nombre: "DESARROLLO DE SOFTWARE",
    rueda: "SOFTWARE",
    detalle: "Habla con el bot · PC y reto web",
    color: "azul",
    icono: "codigo",
  },
  {
    nombre: "MARKETING DIGITAL",
    rueda: "MARKETING",
    detalle: "Diagnóstico express de redes",
    color: "menta",
    icono: "megafono",
  },
  {
    nombre: "CREACIÓN DE CONTENIDO",
    rueda: "CONTENIDO",
    detalle: "Graba tu historia en 20 segundos",
    color: "crema",
    icono: "camara",
  },
];
