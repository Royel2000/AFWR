# Envío Fácil - Backend TypeScript con Clean Architecture

Esqueleto funcional del backend logístico **Envío Fácil** para la Actividad 3.1.
Implementa TypeScript + Node.js + Express con una separación estricta en tres
capas: Dominio, Aplicación e Infraestructura.

## Arquitectura

```text
src/
├── domain/                         # Reglas de negocio puras (sin Express, sin Node APIs)
│   ├── entities/
│   │   ├── Order.ts                # Agregado raíz y máquina de estados
│   │   ├── CancellationRequest.ts  # Solicitud de cancelación (HU-01/HU-03)
│   │   └── CreditNote.ts           # Nota de crédito (HU-03)
│   ├── value-objects/
│   │   ├── TrackingNumber.ts       # Validación de guía EF-AAAA-NNNNNN
│   │   ├── Address.ts              # Validación de dirección de destino
│   │   └── Money.ts                # Monto + moneda con validación
│   ├── enums/
│   │   ├── OrderStatus.ts
│   │   ├── PaymentStatus.ts
│   │   └── CreditNoteStatus.ts
│   ├── errors/
│   │   └── DomainError.ts
│   └── repositories/               # Contratos de persistencia
│       ├── OrderRepository.ts
│       └── CreditNoteRepository.ts
│
├── application/                    # Casos de uso y puertos de salida
│   ├── use-cases/
│   │   ├── CreateOrderUseCase.ts
│   │   ├── GetOrderUseCase.ts
│   │   ├── ListOrdersUseCase.ts
│   │   ├── CancelOrderUseCase.ts             # HU-01
│   │   ├── UpdateDestinationAddressUseCase.ts # HU-02
│   │   ├── CancelPaidOrderUseCase.ts         # HU-03
│   │   └── AdvanceOrderStatusUseCase.ts
│   ├── ports/
│   │   ├── ClockPort.ts
│   │   ├── IdGeneratorPort.ts
│   │   └── FinanceNotifierPort.ts
│   ├── dtos/
│   │   └── OrderDtos.ts
│   └── errors/
│       └── ApplicationError.ts
│
└── infrastructure/                 # Adaptadores concretos
    ├── http/
    │   ├── controllers/OrderController.ts
    │   ├── routes/orderRoutes.ts
    │   ├── middleware/asyncHandler.ts
    │   ├── middleware/errorHandler.ts
    │   ├── presenters/OrderPresenter.ts
    │   └── errors/HttpErrorMapper.ts
    ├── persistence/in-memory/
    │   ├── InMemoryOrderRepository.ts
    │   └── InMemoryCreditNoteRepository.ts
    ├── notifications/ConsoleFinanceNotifier.ts
    ├── clock/SystemClock.ts
    ├── id/UuidGenerator.ts
    ├── config/
    │   ├── container.ts            # Inyección de dependencias manual
    │   └── seed.ts                 # Datos de prueba en memoria
    ├── http/server.ts
    └── main.ts
```

La regla de dependencias se respeta así:

- `domain` no importa nada de `application` ni de `infrastructure`.
- `application` importa `domain` y define puertos que implementa `infrastructure`.
- `infrastructure` importa `application` y `domain`, y es la única capa que
  conoce Express, `node:crypto` y la persistencia en memoria.

## Requisitos

- Node.js 20 o superior
- npm 10 o superior

## Instalación y ejecución

```bash
npm install
```

Modo desarrollo con recarga automática:

```bash
npm run dev
```

Compilar y ejecutar la versión de producción:

```bash
npm run build
npm start
```

El servidor queda disponible en `http://localhost:3000`.
Puede cambiar el puerto con la variable `PORT`:

```bash
PORT=4000 npm start
```

## Scripts disponibles

| Script              | Descripción                                      |
| ------------------- | ------------------------------------------------ |
| `npm run dev`       | Levanta el servidor con `tsx watch`               |
| `npm run build`     | Compila TypeScript a `dist/`                      |
| `npm start`         | Ejecuta el build compilado                        |
| `npm run typecheck` | Verifica tipos sin emitir archivos                |
| `npm test`          | Ejecuta las pruebas con el runner nativo de Node  |

## Endpoints

| Método  | Ruta                        | Descripción                                      | Códigos esperados |
| ------- | --------------------------- | ------------------------------------------------ | ----------------- |
| `GET`   | `/health`                   | Health check                                     | `200`             |
| `GET`   | `/envios`                   | Lista todos los envíos                           | `200`             |
| `POST`  | `/envios`                   | Crea un envío en `PREPARING`                     | `201`, `400`, `409` |
| `GET`   | `/envios/{id}`              | Consulta por UUID o guía                         | `200`, `400`, `404` |
| `PATCH` | `/envios/{id}/estado`       | Avanza estado o cancela (HU-01/HU-03)            | `200`, `400`, `404`, `409` |
| `PATCH` | `/envios/{id}/direccion`    | Modifica dirección de destino (HU-02)            | `200`, `400`, `404`, `409` |

La ruta `/api/v1/envios` es un alias de `/envios`.

El contrato OpenAPI 3.0 está en [`openapi/openapi.yaml`](openapi/openapi.yaml).

## Datos de prueba (seed en memoria)

Al iniciar el servidor se cargan estos envíos:

| UUID                                   | Guía            | Estado        | Pago    | Monto  |
| -------------------------------------- | --------------- | ------------- | ------- | ------ |
| `11111111-1111-4111-8111-111111111111` | `EF-2026-000001` | `PREPARING`   | `PENDING` | 120.00 |
| `22222222-2222-4222-8222-222222222222` | `EF-2026-000002` | `IN_WAREHOUSE`| `PENDING` | 85.50  |
| `33333333-3333-4333-8333-333333333333` | `EF-2026-000003` | `IN_TRANSIT`  | `PENDING` | 200.00 |
| `44444444-4444-4444-8444-444444444444` | `EF-2026-000004` | `PREPARING`   | `PAID`    | 150.50 |
| `55555555-5555-4555-8555-555555555555` | `EF-2026-000005` | `IN_WAREHOUSE`| `PAID`    | 99.99  |
| `66666666-6666-4666-8666-666666666666` | `EF-2026-000006` | `IN_TRANSIT`  | `PAID`    | 300.00 |

## Ejemplos con curl

Cancelar un envío en `PREPARING` (HU-01):

```bash
curl -X PATCH http://localhost:3000/envios/11111111-1111-4111-8111-111111111111/estado \
  -H 'Content-Type: application/json' \
  -d '{
    "estado": "CANCELLED",
    "motivo_cancelacion": "El cliente solicitó la cancelación",
    "usuario_responsable": "operador-01"
  }'
```

Respuesta `200 OK` con `package_status: CANCELLED`, `cancellation` registrada e
`idempotent: false`. Repetir la misma llamada devuelve `200 OK` con
`idempotent: true` y no duplica la solicitud.

Intentar cancelar un envío en `IN_TRANSIT` (debe retornar `409 Conflict`):

```bash
curl -X PATCH http://localhost:3000/envios/33333333-3333-4333-8333-333333333333/estado \
  -H 'Content-Type: application/json' \
  -d '{
    "estado": "CANCELLED",
    "motivo_cancelacion": "Intento tardío de cancelación",
    "usuario_responsable": "operador-01"
  }'
```

Modificar la dirección de un envío en `IN_WAREHOUSE` (HU-02):

```bash
curl -X PATCH http://localhost:3000/envios/22222222-2222-4222-8222-222222222222/direccion \
  -H 'Content-Type: application/json' \
  -d '{"direccion_destino": "Av. Javier Prado 2020, Lima"}'
```

Intentar modificar la dirección de un envío en `IN_TRANSIT` (debe retornar
`409 Conflict`):

```bash
curl -X PATCH http://localhost:3000/envios/33333333-3333-4333-8333-333333333333/direccion \
  -H 'Content-Type: application/json' \
  -d '{"direccion_destino": "Av. Javier Prado 2020, Lima"}'
```

Cancelar un envío pagado y generar nota de crédito (HU-03):

```bash
curl -X PATCH http://localhost:3000/envios/55555555-5555-4555-8555-555555555555/estado \
  -H 'Content-Type: application/json' \
  -d '{
    "estado": "CANCELLED",
    "motivo_cancelacion": "Cancelación con reembolso solicitada",
    "usuario_responsable": "operador-01",
    "monto_nota_credito": 99.99
  }'
```

La respuesta incluye `credit_note` con el monto exacto y la consola muestra la
notificación a Finanzas. Si `monto_nota_credito` no coincide con
`card_charged_amount`, la API retorna `400 Bad Request` con código
`CREDIT_NOTE_AMOUNT_MISMATCH` y no cancela el envío.

Crear un envío (guía inválida retorna `400`):

```bash
curl -X POST http://localhost:3000/envios \
  -H 'Content-Type: application/json' \
  -d '{
    "tracking_number": "EF-2026-000100",
    "destination_address": "Av. Nueva 100, Lima",
    "card_charged_amount": 75.25,
    "currency": "PEN",
    "payment_status": "PENDING"
  }'
```

## Reglas de negocio implementadas

### Máquina de estados

Transiciones permitidas:

```text
PREPARING -> IN_WAREHOUSE -> IN_TRANSIT
PREPARING -> CANCELLED
IN_WAREHOUSE -> CANCELLED
```

Transiciones prohibidas (HTTP `409 Conflict`):

- Cancelar un envío en `IN_TRANSIT`.
- Modificar la dirección de un envío en `IN_TRANSIT`.
- Modificar o cancelar un envío en `CANCELLED` (la cancelación repetida es
  idempotente y no genera conflicto).
- Avanzar de estado saltando pasos, por ejemplo `PREPARING -> IN_TRANSIT`.

### HU-01: cancelación antes del despacho

- Válida en `PREPARING` e `IN_WAREHOUSE`.
- Registra `cancellation_reason`, fecha/hora y usuario responsable.
- Es idempotente: una segunda cancelación no crea otra solicitud.
- En `IN_TRANSIT` retorna `409 Conflict`.

### HU-02: modificación de dirección

- Válida en `PREPARING` e `IN_WAREHOUSE`.
- Se rechaza con `409 Conflict` si el envío ya está en `IN_TRANSIT` o
  `CANCELLED`.

### HU-03: cancelación con pago procesado

- Aplica cuando `payment_status = PAID`.
- Genera una `CreditNote` por el monto exacto de `card_charged_amount`.
- Notifica a Finanzas mediante `FinanceNotifierPort`.
- Si se envía `monto_nota_credito`, se valida igualdad exacta de monto y moneda.
- No duplica la nota de crédito ni la notificación al reintentar.

## Inyección de dependencias manual

No se usan contenedores ni decoradores. El punto de composición es
`src/infrastructure/config/container.ts`, donde se instancian los repositorios,
adaptadores y casos de uso y se pasan por constructor:

```ts
const cancelPaidOrderUseCase = new CancelPaidOrderUseCase(
  orderRepository,
  creditNoteRepository,
  financeNotifier,
  idGenerator,
  clock,
);

const cancelOrderUseCase = new CancelOrderUseCase(
  orderRepository,
  cancelPaidOrderUseCase,
  idGenerator,
  clock,
);
```

## Pruebas

```bash
npm test
```

Las pruebas cubren:

- HU-01: cancelación válida, idempotencia y rechazo en `IN_TRANSIT`.
- HU-02: cambio de dirección válido y rechazo en `IN_TRANSIT`.
- HU-03: generación de nota de crédito, no duplicidad y validación de monto.
- Máquina de estados: transiciones válidas e inválidas.

## Notas de diseño

- La persistencia es en memoria (`Map`), por lo que los datos se reinician al
  reiniciar el servidor. No se conecta PostgreSQL, MongoDB ni ningún motor
  externo.
- Los errores de dominio no conocen HTTP. El mapeo a `400`, `404`, `409` y `500`
  se hace en `HttpErrorMapper`, dentro de infraestructura.
- El dominio no importa Express ni módulos de Node. Las fechas y los IDs se
  inyectan mediante `ClockPort` e `IdGeneratorPort` para mantenerlo testeable.
