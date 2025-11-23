# Solución: ERR_BLOCKED_BY_CLIENT en Firestore

## ✅ Problema Resuelto: API Key de Gemini

¡Excelente! El mensaje "✅ API Key encontrada" confirma que la API key de Gemini está funcionando correctamente.

## ⚠️ Nuevo Problema: ERR_BLOCKED_BY_CLIENT

El error `net::ERR_BLOCKED_BY_CLIENT` en Firestore generalmente es causado por:

### Causa Principal: Bloqueador de Anuncios

Las extensiones del navegador que bloquean anuncios (como uBlock Origin, AdBlock, etc.) a veces bloquean las solicitudes a Firestore porque detectan patrones similares a rastreadores.

## 🔧 Soluciones (en orden de facilidad)

### Solución 1: Desactivar Bloqueador de Anuncios (Temporal)

1. **Identifica tu bloqueador de anuncios:**
   - uBlock Origin
   - AdBlock
   - AdBlock Plus
   - Privacy Badger
   - Cualquier otra extensión de bloqueo

2. **Desactívalo temporalmente:**
   - Haz clic en el icono de la extensión
   - Desactívala para este sitio
   - Recarga la página (F5)

3. **Verifica si el error desaparece**

### Solución 2: Agregar Excepción para Firestore

Si usas uBlock Origin o similar:

1. Haz clic en el icono de la extensión
2. Busca "Permitir en este sitio" o "Whitelist"
3. O agrega manualmente estas URLs a la lista blanca:
   - `firestore.googleapis.com`
   - `*.googleapis.com`
   - `*.firebaseio.com`

### Solución 3: Modo Incógnito

Prueba en una ventana de incógnito (sin extensiones):

1. Presiona `Ctrl+Shift+N` (Chrome) o `Ctrl+Shift+P` (Firefox)
2. Abre tu aplicación
3. Si funciona en incógnito, confirma que es un bloqueador de anuncios

### Solución 4: Verificar Extensiones del Navegador

1. Ve a `chrome://extensions/` (Chrome) o `about:addons` (Firefox)
2. Desactiva temporalmente todas las extensiones
3. Recarga la página
4. Si funciona, reactiva las extensiones una por una para identificar cuál causa el problema

## 🔍 Verificación

Después de aplicar una solución:

1. ✅ Abre la consola del navegador (F12)
2. ✅ Busca errores de Firestore
3. ✅ Verifica que los datos se cargan correctamente
4. ✅ Prueba crear un curso o usuario

## 📝 Nota Importante

Este error **NO afecta la funcionalidad** si:
- Los datos se cargan correctamente
- Puedes crear/editar cursos
- La autenticación funciona

El error puede ser solo un warning que no impide el funcionamiento.

## 🚨 Si el Problema Persiste

Si después de desactivar bloqueadores el error continúa:

1. **Verifica la configuración de Firebase:**
   - Asegúrate de que las reglas de Firestore están desplegadas
   - Verifica que el proyecto de Firebase está correctamente configurado

2. **Revisa la consola del servidor:**
   - Puede haber errores adicionales que ayuden a diagnosticar

3. **Verifica la red:**
   - Asegúrate de que no hay firewall corporativo bloqueando Google APIs

## ✅ Estado Actual

- ✅ API Key de Gemini: **Funcionando**
- ⚠️ Firestore: **Bloqueado por extensión del navegador** (probablemente)

La aplicación debería funcionar normalmente después de desactivar el bloqueador de anuncios.

