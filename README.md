# Ruleta · Hub Challenge

Carpeta lista para subir a GitHub y conectar con Vercel.

## Qué hay aquí

| Archivo / carpeta | Uso |
|---|---|
| `index.html` | Pantalla de la ruleta |
| `css/`, `js/`, `fonts/`, `marca/` | Estilos, lógica, tipografías y logos |
| `opciones.json` | Datos que usa la web en Vercel |
| `Opciones de la ruleta.xlsx` | Excel para editar opciones y textos |
| `sync-opciones.py` | Pasa el Excel a `opciones.json` |
| `vercel.json` | Rutas y caché para Vercel |

En Vercel **no** se lee el Excel en vivo. Se publica el `opciones.json`.

## Subir a GitHub

1. Crea un repositorio nuevo en GitHub (puede ser vacío).
2. Sube **el contenido de esta carpeta `ruleta-web`** como raíz del repo  
   (o sube la carpeta entera y en Vercel marca Root Directory = `ruleta-web`).
3. No hace falta `npm install`: es un sitio estático.

## Conectar con Vercel

1. En [vercel.com](https://vercel.com) → **Add New Project**.
2. Importa el repo de GitHub.
3. Framework Preset: **Other**.
4. Build Command: vacío.
5. Output Directory: vacío (o `.` si te lo pide).
6. Si el repo tiene más cosas y esta carpeta no es la raíz, pon **Root Directory** = `ruleta-web`.
7. Deploy.

La URL queda tipo `https://tu-proyecto.vercel.app`.

## Cambiar opciones o textos

1. Edita `Opciones de la ruleta.xlsx` (hojas **Opciones** e **Informacion**).
2. Genera el JSON:

```bash
python sync-opciones.py
```

(Necesitas Python con `openpyxl`: `pip install openpyxl`.)

3. Sube a GitHub el Excel y el `opciones.json` actualizado.
4. Vercel redeploya solo.

Si no quieres usar Python, también puedes editar a mano `opciones.json` y subir ese archivo.

## Probar en local

Abre la carpeta con cualquier servidor estático, por ejemplo:

```bash
npx serve .
```

o en VS Code / Cursor, Live Server sobre `index.html`.
