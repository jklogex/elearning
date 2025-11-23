# Configuración de API Key de Gemini

## ⚠️ Error: "API key is missing"

Si estás viendo este error, necesitas configurar tu clave API de Gemini.

## Solución Rápida

### Paso 1: Obtener tu API Key

1. Ve a: https://aistudio.google.com/apikey
2. Inicia sesión con tu cuenta de Google
3. Haz clic en "Create API Key" o "Get API Key"
4. Copia la clave API generada

### Paso 2: Configurar en el Proyecto

1. **Crea o edita el archivo `.env.local`** en la raíz del proyecto:
   ```
   c:\jkfirebase\elearning\.env.local
   ```

2. **Agrega tu clave API:**
   ```env
   VITE_GEMINI_API_KEY=tu_clave_api_aqui
   ```
   
   Reemplaza `tu_clave_api_aqui` con la clave que copiaste.

3. **Reinicia el servidor de desarrollo:**
   ```bash
   # Detén el servidor (Ctrl+C)
   # Luego inicia de nuevo:
   npm run dev
   ```

## Verificación

Después de configurar la API key:

1. ✅ El error "API key is missing" debería desaparecer
2. ✅ Podrás generar cuestionarios desde PDFs
3. ✅ Podrás generar diagramas, podcasts y videos
4. ✅ Podrás extraer texto de documentos PDF

## Estructura del Archivo .env.local

Tu archivo `.env.local` debería verse así:

```env
# Firebase Configuration
VITE_FIREBASE_API_KEY=tu_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=tu-proyecto.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=tu-proyecto-id
VITE_FIREBASE_STORAGE_BUCKET=tu-proyecto.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abcdef

# Gemini API Key (REQUERIDO para funciones de IA)
VITE_GEMINI_API_KEY=tu_clave_api_de_gemini_aqui
```

## Notas Importantes

- ⚠️ **NUNCA** subas el archivo `.env.local` a Git
- ✅ El archivo `.gitignore` ya está configurado para ignorarlo
- 🔑 La API key es gratuita para uso limitado
- 💰 La generación de video requiere una clave API pagada

## Solución de Problemas

### El error persiste después de configurar

1. **Verifica que el archivo se llama exactamente `.env.local`** (con el punto al inicio)
2. **Asegúrate de reiniciar el servidor** después de agregar la clave
3. **Verifica que no hay espacios** alrededor del signo `=`
4. **Verifica que la clave API es válida** en https://aistudio.google.com/apikey

### Error: "Invalid API key"

- Verifica que copiaste la clave completa
- Asegúrate de que no hay espacios o saltos de línea
- Prueba generar una nueva clave API

### Funciones que requieren API Key

- ✅ **Generar Cuestionario** - Requiere API key (gratuita)
- ✅ **Extraer Texto de PDF** - Requiere API key (gratuita)
- ✅ **Generar Diagrama** - Requiere API key (gratuita)
- ✅ **Generar Podcast** - Requiere API key (gratuita)
- 💰 **Generar Video** - Requiere API key pagada

## Alternativa: AI Studio

Si estás ejecutando la aplicación en Google AI Studio, puedes seleccionar la clave API a través de la interfaz de AI Studio sin necesidad de configurar `.env.local`.

