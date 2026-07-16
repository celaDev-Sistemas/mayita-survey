# mayITa Survey

Estructura frontend ordenada para publicar como sitio estático.

## Estructura

- `index.html`: estructura y pantallas.
- `assets/css/styles.css`: estilos.
- `assets/js/app.js`: autenticación, juego, encuesta y Graph.
- `assets/img/`: imágenes extraídas del JavaScript para reducir el peso y facilitar mantenimiento.

## Configuración obligatoria

En `assets/js/app.js`, revisa:

- `MSAL_CONFIG.auth.clientId`
- `MSAL_CONFIG.auth.authority`
- `MSAL_CONFIG.auth.redirectUri`
- `SCOPES`
- `VALID_DOMAINS`

El `redirectUri` debe existir exactamente como Redirect URI tipo **Single-page application (SPA)** en Entra ID.

## Importante

1. El contador `dbCount` no es una base de datos real. Para persistencia corporativa debe conectarse un endpoint/backend, Power Automate, n8n o una API.
2. Microsoft Graph no permite crear un chat one-to-one del usuario consigo mismo. Para enviar un mensaje confiable se recomienda:
   - usar un backend con permisos de aplicación;
   - enviar a un chat o canal previamente definido;
   - o llamar un webhook/flujo de n8n o Power Automate.
3. No publiques secretos, client secrets ni API keys dentro del frontend.

## Prueba local

No abras el archivo con doble clic. Levanta un servidor local:

```bash
python3 -m http.server 8080
```

Luego abre `http://localhost:8080`.
