# Configurar envío de emails

Por defecto las notificaciones (resumen de consulta, recordatorios) **solo se registran en consola** y no se envía ningún correo real.

Para que los correos lleguen al cliente:

1. En tu archivo **`.env`** del backend, define:

```env
NOTIFICATION_BACKEND=smtp
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=tu-email@gmail.com
SMTP_PASSWORD=tu-contraseña-de-aplicacion
SMTP_FROM_EMAIL=tu-email@gmail.com
```

2. **Gmail:** usa una [Contraseña de aplicación](https://support.google.com/accounts/answer/185833) (no tu contraseña normal). Habilitar "Acceso de aplicaciones menos seguras" o mejor, 2 pasos de verificación + contraseña de aplicación.

3. **Otros proveedores:** usa host/puerto que indique tu proveedor (ej. Outlook: `smtp.office365.com`, 587).

4. Reinicia el servidor (uvicorn) tras cambiar `.env`.
