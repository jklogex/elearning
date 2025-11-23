# Solución de Problemas: API Key no Detectada

## Problema: "Se requiere una clave API de Gemini"

Si ya configuraste `VITE_GEMINI_API_KEY` en `.env.local` pero sigues viendo el error, sigue estos pasos:

## ✅ Solución Paso a Paso

### 1. Verifica el Archivo .env.local

Asegúrate de que el archivo existe y tiene el formato correcto:

**Ubicación:** `c:\jkfirebase\elearning\.env.local`

**Contenido debe ser:**
```env
VITE_GEMINI_API_KEY=tu_clave_api_aqui
```

**Importante:**
- ✅ El archivo debe llamarse exactamente `.env.local` (con el punto al inicio)
- ✅ No debe haber espacios alrededor del signo `=`
- ✅ No debe haber comillas alrededor del valor
- ✅ Debe estar en la raíz del proyecto (mismo nivel que `package.json`)

### 2. Reinicia el Servidor de Desarrollo

**CRÍTICO:** Vite solo carga las variables de entorno al iniciar. Si agregaste la variable después de iniciar el servidor, debes reiniciarlo.

```bash
# 1. Detén el servidor (presiona Ctrl+C en la terminal)
# 2. Inicia de nuevo:
npm run dev
```

### 3. Verifica en la Consola del Navegador

Abre la consola del navegador (F12) y busca estos mensajes:

- ✅ **"✅ API Key encontrada"** = Todo está bien
- ⚠️ **"⚠️ API Key no encontrada"** = Hay un problema

### 4. Verifica que la Variable se Expone

En la consola del navegador, ejecuta:
```javascript
console.log(import.meta.env.VITE_GEMINI_API_KEY)
```

- Si muestra tu clave API → ✅ Está configurada correctamente
- Si muestra `undefined` → ⚠️ Necesitas reiniciar el servidor

## Problemas Comunes

### Problema 1: El servidor no se reinició

**Síntoma:** Agregaste la variable pero sigue sin funcionar

**Solución:**
1. Detén completamente el servidor (Ctrl+C)
2. Espera 2-3 segundos
3. Inicia de nuevo: `npm run dev`
4. Recarga la página en el navegador (F5)

### Problema 2: Nombre incorrecto del archivo

**Síntoma:** El archivo existe pero Vite no lo lee

**Solución:**
- Verifica que se llama exactamente `.env.local` (no `.env`, no `env.local`)
- En Windows, puede que necesites crear el archivo desde la terminal:
  ```bash
  echo VITE_GEMINI_API_KEY=tu_clave > .env.local
  ```

### Problema 3: Formato incorrecto

**Síntoma:** La variable está en el archivo pero no se lee

**Formato CORRECTO:**
```env
VITE_GEMINI_API_KEY=AIzaSyDBCL5KEhhpPNg5EUaWP7OGXmyNKRVJfKQ
```

**Formato INCORRECTO:**
```env
VITE_GEMINI_API_KEY = AIzaSyDBCL5KEhhpPNg5EUaWP7OGXmyNKRVJfKQ  # ❌ Espacios
VITE_GEMINI_API_KEY="AIzaSyDBCL5KEhhpPNg5EUaWP7OGXmyNKRVJfKQ"  # ❌ Comillas
VITE_GEMINI_API_KEY='AIzaSyDBCL5KEhhpPNg5EUaWP7OGXmyNKRVJfKQ'  # ❌ Comillas simples
```

### Problema 4: Variable en .env en lugar de .env.local

**Síntoma:** Tienes la variable pero en el archivo equivocado

**Solución:**
- Usa `.env.local` (no `.env`)
- `.env.local` está en `.gitignore` y es más seguro
- `.env` puede estar siendo ignorado o sobrescrito

## Verificación Final

Después de seguir los pasos, verifica:

1. ✅ El archivo `.env.local` existe en la raíz
2. ✅ Contiene `VITE_GEMINI_API_KEY=tu_clave`
3. ✅ El servidor se reinició después de agregar la variable
4. ✅ La consola muestra "✅ API Key encontrada"
5. ✅ `import.meta.env.VITE_GEMINI_API_KEY` no es `undefined`

## Si Nada Funciona

1. **Elimina el archivo `.env.local`** y créalo de nuevo
2. **Verifica que no hay caracteres ocultos** (usa un editor de texto simple)
3. **Prueba con una clave API diferente** para descartar problemas con la clave
4. **Revisa la consola del servidor** (no solo del navegador) para ver errores de Vite

## Comando de Verificación Rápida

En PowerShell, ejecuta:
```powershell
Get-Content .env.local | Select-String "GEMINI"
```

Deberías ver:
```
VITE_GEMINI_API_KEY=tu_clave_aqui
```

Si no ves nada, el archivo no existe o no tiene la variable.

