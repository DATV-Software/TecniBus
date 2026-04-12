# Primera Build de Producción (First-Time Setup)

## Contexto

TecniBus aún no tiene una build de producción. Todas las futuras actualizaciones usarán `eas update` (cero créditos de Expo), pero la PRIMERA build requiere compilación inicial en EAS.

## Pasos para la Primera Build

### 1. Configurar Credenciales de Expo

```bash
# Login a Expo (si no estás ya logged in)
eas login

# Verificar que tu cuenta está configured en eas.json
eas build --help | grep account
```

### 2. Crear Build de Producción (Local)

```bash
# Build para iOS (si quieres)
eas build --platform ios --profile production

# Build para Android (si quieres)
eas build --platform android --profile production

# Build para ambas (Android + iOS)
eas build --platform all --profile production
```

**Nota**: Esto tardará 10-30 minutos por plataforma. EAS compilará en la cloud.

### 3. Monitorear el Build

Durante el build, obtendrás:
- URL del build en la cloud
- Status updates en tiempo real
- Enlace al APK/IPA cuando esté listo

```bash
# Ver builds anteriores
eas build:list

# Ver detalles de un build específico
eas build:view <BUILD_ID>
```

### 4. Descargar el Build

Una vez completado:
```bash
# iOS: Obtén el .ipa
# Android: Obtén el .apk

# Puedes distribuir a testers usando EAS Submit
eas submit --platform ios --path <PATH_TO_IPA>
eas submit --platform android --path <PATH_TO_APK>
```

### 5. Verificar Build en Production Channel

```bash
# El build debe estar en el channel 'production' (ver eas.json)
# Verifica que pueda iniciar correctamente en dispositivos
```

## Después: Futuras Actualizaciones

Una vez que la primera build esté en producción, TODAS las futuras actualizaciones usan:

```bash
# Esta es la forma que usará el CI/CD automático
eas update --branch production --message "Description"

# Zero Expo credits - solo JavaScript/assets
```

## Deploy Workflow Automático

Una vez que tengas la build de producción:

1. **Merge a main** → CI pasa
2. **Deploy workflow triggeado automáticamente**
3. **`eas update` ejecutado** → App actualizada en minutos
4. Usuarios obtienen la actualización automáticamente (si tienen updates habilitadas)

## Preguntas Frecuentes

**¿Cuánto cuesta la primera build?**
- Depende de tu plan de Expo. Usualmente 1 build = parte de tus créditos mensuales.

**¿Y si falla la compilación?**
- Verás el log de error en la CLI. Usualmente problemas de dependencias o configuración.
- Solucionar localmente y reintentar.

**¿Se puede hacer rollback?**
- Sí, puedes hacer `eas update --branch production` con un commit anterior.
- O mantener una versión "stable" con su propio build.

---

**Status**: Lista para build de producción. Babel config arreglado.
**Próximo paso**: Ejecutar `eas build --platform all --profile production` localmente.
