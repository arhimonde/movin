# MOVIN — Proyecto Full Stack

MOVIN es una aplicación para revisar inventarios de una vivienda antes de una mudanza. El proyecto combina visión artificial, normalización de detecciones, cálculo de volumen y una interfaz web móvil en español.

El repositorio contiene dos bloques principales:

- **Parte A:** evaluación del dataset, triage de imágenes, inferencia con Roboflow y documentación de la taxonomía.
- **Parte B:** lógica de inventario, API local de fotografías y experiencia web de revisión y confirmación.

## Enlaces del proyecto

- **Código fuente:** https://github.com/arhimonde/movin
- **Aplicación publicada:** https://movin-jn3v.vercel.app

## Ejecutar la demo local

```bash
cd part-b
npm install
npm test
npm run quote
npm run web:install
cd web
npm run dev
```

Abre la URL local de Vite, normalmente `http://127.0.0.1:5173/`. La interfaz de confirmación está en español y utiliza un fixture normalizado generado a partir de respuestas reales de Roboflow.

Para iniciar la API local de carga de fotografías, abre una segunda terminal y ejecuta:

```bash
cd part-b
npm run api
```

Consulta [`part-b/README.md`](part-b/README.md) y [`part-b/NOTES_B1_B3.md`](part-b/NOTES_B1_B3.md) para conocer los límites de la API y de la interfaz, además de la lista de aceptación manual. La documentación de la Parte A está en [`part-a/README.md`](part-a/README.md).

## Qué puede hacer la aplicación

- Solicitar un perfil antes de mostrar el inventario.
- Guardar nombre, número de almacén y avatar.
- Gestionar varios usuarios locales y cambiar entre perfiles.
- Revisar las habitaciones y las detecciones agrupadas.
- Ajustar cantidades y revisar objetos marcados.
- Añadir manualmente objetos con una fotografía opcional.
- Introducir largo, ancho y alto en centímetros mediante el cubo 🧊.
- Convertir automáticamente las dimensiones a metros cúbicos.
- Eliminar objetos, deshacer la eliminación y confirmar el inventario.
- Persistir perfiles e inventarios en el navegador mediante `localStorage`.

## Datos y credenciales

Las respuestas raw de Roboflow se conservan en `part-b/fixtures/roboflow_raw/` y el fixture normalizado está en `part-b/fixtures/detections.json`. Las claves API se introducen de forma interactiva y nunca deben guardarse ni subirse al repositorio. El archivo `.env.example` documenta las configuraciones locales opcionales.

El modelo público utilizado para la demostración es `furniture-o6003/2` a través de `https://serverless.roboflow.com`. Las detecciones normalizadas conservan información de procedencia, como la clase original, la clase mapeada y la versión del mapa de clases.

## Verificación

Antes de revisar cambios, ejecuta:

```bash
cd part-b
npm test
npm run quote
npm run web:build
cd ../part-a/scripts
python3 -m unittest -q
```

La aplicación web también se compila con Vite y está configurada para desplegarse desde `part-b/web` en Vercel.

## Límite de producción

La API B1 utiliza actualmente almacenamiento en memoria y está pensada para desarrollo, revisión y pruebas. Un entorno de producción todavía necesitaría una base de datos persistente, almacenamiento de objetos compatible con S3 o R2, URLs presignadas, autenticación, variables de entorno y un proceso de expiración para cargas abandonadas.

La persistencia de perfiles, inventarios y fotografías de la interfaz se realiza en `localStorage`, por lo que está limitada por la cuota del navegador y por el dispositivo utilizado. No sustituye todavía a una cuenta centralizada ni a un backend multiusuario.
