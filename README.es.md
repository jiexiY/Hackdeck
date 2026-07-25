# HACKdeck

[English](README.md) | [简体中文](README.zh-CN.md) | [Español](README.es.md)

HACKdeck es un rastreador público y multilingüe de hackatones verificados, build weeks y programas de grandes empresas de inteligencia artificial y tecnología. Presenta las oportunidades en una línea de tiempo cronológica conectada para que las personas creadoras puedan comparar fechas, plazos de solicitud, ubicaciones, requisitos, formatos, premios y estados.

**Sitio web:** [hackdeck-app.vercel.app](https://hackdeck-app.vercel.app/)

## Funciones principales

- Oportunidades verificadas de empresas, universidades, programas globales, remotos y build weeks
- Línea de tiempo conectada y desplazable con tarjetas ordenadas cronológicamente
- Filtros por organizador, ubicación, participación remota, fechas, plazos, premios, requisitos, formato y estado
- Vistas detalladas de cada evento con enlaces a la fuente oficial o de la organización
- Interfaz disponible en inglés, chino mandarín simplificado y español
- Hackatones guardados localmente en el navegador
- Exportación e importación JSON para crear copias de seguridad portátiles
- No requiere cuenta ni registro

## Ejecutar localmente

Requisitos: Node.js 20+ y pnpm.

```bash
pnpm install
pnpm dev
```

Abre en el navegador la dirección local que muestra Vite.

## Validar y compilar

```bash
pnpm validate:data
pnpm build
```

## Datos de eventos

El feed verificado se encuentra en `src/data/events.js`. Un evento solo se incluye cuando está confirmado por una página oficial de la empresa o por una fuente de la organización. Las empresas supervisadas son objetivos de descubrimiento, no eventos por sí mismas.

Al actualizar el feed:

1. Verifica las fechas y los detalles con una fuente oficial o de la organización.
2. Elimina los identificadores de eventos y las URL de fuentes duplicados.
3. Archiva los eventos finalizados para retirarlos del feed publicado.
4. Mantén `feedMeta.sourceCount` alineado con `sourceCatalog`.
5. Ejecuta los comandos de validación y compilación indicados arriba.

## Eventos guardados y privacidad

Los hackatones guardados permanecen en el navegador mediante almacenamiento local. HACKdeck no requiere una cuenta ni carga los datos guardados. Las personas visitantes pueden exportar una copia de seguridad JSON e importarla en otro navegador o dispositivo.

## Contribuir

Las pull requests son bienvenidas. Para añadir o corregir un evento, incluye la fuente oficial de la empresa o de la organización que confirme la información enviada.
