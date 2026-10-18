# Lumora

Página que convierte un guion en todos los prompts de imagen de la historia, con el sistema de Nando
(desglose + fichas maestras + lotes de 50 con Claude Opus 5.5 en esfuerzo alto, armados con código en un solo .md).
El cliente paga con Mercado Pago y la página arranca sola.

## Variables secretas (Vercel > Settings > Environment Variables)

| Variable | Obligatoria | Para qué sirve |
|---|---|---|
| ANTHROPIC_API_KEY | Sí | Tu clave de la API de Claude. Solo vive en el servidor. |
| CODIGO_DUENO | Sí | Tu código personal: usas la página gratis y ves cuánto gastó cada historia. |
| MP_ACCESS_TOKEN | Para cobrar | Access Token de producción de Mercado Pago (empieza con `APP_USR-`). Sin esto no aparece el botón de pagar. |
| WHATSAPP | No | Tu número con código de país (ej. `51999999999`). No aparece en la página: el enlace pasa por `/api/whatsapp`. |
| PRECIO_MINUTO | No | Precio por minuto de historia, en dólares. Por defecto `1.2`. |
| TIPO_CAMBIO | No | Soles por dólar para cobrar en Mercado Pago Perú. Por defecto `3.46` (el cobro se redondea al sol entero hacia arriba). |
| MINIMO_MINUTOS | No | Cobro mínimo en minutos. Por defecto `10`. |
| MAXIMO_MINUTOS | No | Máximo de minutos por compra. Por defecto `40`. |
| TOPE_DOLARES_MINUTO | No | Lo máximo que una historia pagada puede gastar de API por minuto pagado. Por defecto `1` (dólar). |
| CODIGOS_ACCESO | No | Códigos manuales para clientes, separados por coma (para ventas por Yape a mano). |
| MONEDA | No | Moneda del cobro en Mercado Pago. Por defecto `PEN`. |
| ESFUERZO | No | Esfuerzo de Opus: `high` por defecto. |

La base de datos (Upstash Redis, desde Vercel > Storage) pone sola sus variables `KV_REST_API_URL` y `KV_REST_API_TOKEN`.
Con ella se activa el tope de gasto por pago.

## Cómo funciona por dentro

1. El precio se calcula contando palabras: no gasta API.
2. "Pagar con Mercado Pago" crea un cobro amarrado a ESE guion (huella SHA-256 + minutos + monto en la referencia del pedido).
3. Al volver de Mercado Pago, el servidor revisa en Mercado Pago que el pago esté aprobado y que sea de ese guion. Un pago no sirve para otra historia.
4. Desglose por partes (texto exacto, numeración continua), FICHAS_MAESTRAS en JSON y lotes de 50: Opus escribe solo lo único de cada número y el código pega ficha ADN, cadena fija, cadena de enfoque y firma (Regla 0).
5. Cada llamada a Claude suma su costo al pedido; si llega al tope, se detiene (protege tus créditos).
6. Al final, todo se junta en un solo PROMPTS_1-N.md.

Las instrucciones originales están en `lib/instrucciones.js` (solo servidor, el cliente nunca las ve).

## Probar sin gastar API (en una computadora con Node)

```
SIMULACION=1 CODIGO_DUENO=dueno node dev.mjs
```
Con `SIMULACION=1` y sin `MP_ACCESS_TOKEN`, el pago también es simulado.
