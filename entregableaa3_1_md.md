# Entregable AA3.1: Construcción del Software - Sistema Logístico "Envío Fácil"

## Datos Institucionales y de la Asignatura
* **Institución:** Tecnológico Nacional de México - Instituto Tecnológico Superior de Felipe Carrillo Puerto
* **Carrera:** Ingeniería en Sistemas Computacionales (ISC-5A)
* **Asignatura:** Fundamentos de Ingeniería de Software
* **Tema:** Tema 3. Arquitectura y Código (AA3.1 Construcción del software)
* **Docente:** MTI. Paloma Góngora Sabido
* **Integrantes del Equipo:**
  * David Aarón Conde García
  * Jesús Alejandro Xool Dzib
  * Ángel Adrián Kau Mis
  * Niels Stephen Aranda Lugo
* **Fecha de Entrega:** Noviembre 2026

---

## 1. Resumen Ejecutivo de la Arquitectura
El propósito de este entregable es materializar los diseños teóricos previamente validados en las actividades **AA1.2** (Historias de Usuario y Gherkin), **AA2.1** (Modelado de Datos y Máquina de Estados) y **AA2.3** (Contrato OpenAPI 3.0) en un esqueleto backend totalmente funcional escrito en **TypeScript con Node.js y Express**.

La construcción sigue de forma estricta los principios de **Clean Architecture (Arquitectura Limpia)** organizados en tres capas concéntricas, manteniendo la **Inversión de Dependencias (DIP)**: los componentes del núcleo de negocio no dependen de librerías, marcos de trabajo HTTP ni motores de persistencia externos.

---

## 2. Estructura del Proyecto y Capas de la Arquitectura

```text
src/
├── domain/                         # Capa 1: Entidades puras y reglas de negocio
│   ├── entities/                   # Agregados y entidades principales (Order, CancellationRequest, CreditNote)
│   ├── value-objects/              # Objetos de valor validados (TrackingNumber, Address, Money)
│   ├── enums/                      # Catálogos de estado (OrderStatus, PaymentStatus, CreditNoteStatus)
│   ├── errors/                     # Errores propios del dominio
│   └── repositories/               # Interfaces/Contratos para persistencia (OrderRepository, CreditNoteRepository)
│
├── application/                    # Capa 2: Casos de uso y puertos de salida
│   ├── use-cases/                  # Flujos de negocio orquestados (CancelOrder, UpdateAddress, CancelPaidOrder, etc.)
│   ├── ports/                      # Puertos de abstracción externa (ClockPort, IdGeneratorPort, FinanceNotifierPort)
│   ├── dtos/                       # Data Transfer Objects para entrada/salida
│   └── errors/                     # Excepciones del flujo de aplicación
│
└── infrastructure/                 # Capa 3: Adaptadores de entrada/salida e infraestructura concreta
    ├── http/                       # Controladores Express, mapeo OpenAPI, middlewares y rutas REST
    ├── persistence/in-memory/      # Repositorios en memoria usando colecciones nativas (Map)
    ├── notifications/              # Notificador de finanzas para consola
    ├── clock/                      # Proveedor de fecha/hora del sistema (SystemClock)
    ├── id/                         # Generador de UUIDs (UuidGenerator)
    ├── config/                     # Contenedor de Inyección Manual de Dependencias y Seed de pruebas
    └── main.ts                     # Punto de entrada y arranque del servidor HTTP local
```

### Reglas de Dependencia
1. **`domain`**: No conoce Express, Node.js APIs ni bases de datos. Contiene la lógica pura de la máquina de estados.
2. **`application`**: Consume `domain` y define interfaces (puertos) para servicios externos o persistencia.
3. **`infrastructure`**: Implementa los puertos y expone los adaptadores HTTP, gestionando el servidor web y los datos en memoria.

---

## 3. Matriz de Cumplimiento de Historias de Usuario

| Historia de Usuario | Descripción de Negocio | Regla / Restricción de Dominio | Implementación Backend | Código HTTP Esperado |
| :--- | :--- | :--- | :--- | :--- |
| **HU-01** | Cancelación de envío antes del despacho | Válida en `PREPARING` y `WAREHOUSE`. Se prohíbe en `IN_TRANSIT`. Es idempotente. | `CancelOrderUseCase` | `200 OK` (éxito) / `409 Conflict` (en ruta) |
| **HU-02** | Modificación de dirección de destino | Permite actualizar la dirección antes de salir del almacén (`PREPARING`, `WAREHOUSE`). | `UpdateDestinationAddressUseCase` | `200 OK` (actualizado) / `409 Conflict` (en ruta) |
| **HU-03** | Cancelación con pago procesado | Válido cuando `payment_status = PAID`. Genera `CreditNote`, valida el monto y notifica a Finanzas. | `CancelPaidOrderUseCase` | `200 OK` (nota emitida) / `400 Bad Request` (monto no coincide) |

---

## 4. Inyección de Dependencias Manual

Dando cumplimiento a las restricciones del proyecto, **no se utilizaron contenedores reflexivos ni frameworks pesados de inyección de dependencias**. La instanciación de dependencias se realiza explícitamente en el punto de composición (`src/infrastructure/config/container.ts`) mediante constructores:

```typescript
// Ejemplo de instanciación e inyección manual por constructor
const orderRepository = new InMemoryOrderRepository();
const creditNoteRepository = new InMemoryCreditNoteRepository();
const financeNotifier = new ConsoleFinanceNotifier();
const clock = new SystemClock();
const idGenerator = new UuidGenerator();

const cancelPaidOrderUseCase = new CancelPaidOrderUseCase(
  orderRepository,
  creditNoteRepository,
  financeNotifier,
  idGenerator,
  clock
);

const cancelOrderUseCase = new CancelOrderUseCase(
  orderRepository,
  cancelPaidOrderUseCase,
  idGenerator,
  clock
);

export const orderController = new OrderController(
  cancelOrderUseCase,
  updateAddressUseCase,
  // ...demás casos de uso
);
```

---

## 5. Instrucciones de Compilación y Ejecución Local

### Requisitos Previos
* Node.js v20.0.0 o superior
* npm v10.0.0 o superior

### Instalación de Dependencias
```bash
npm install
```

### Ejecución en Modo Desarrollo
```bash
npm run dev
```
El servidor estará escuchando activamente en `http://localhost:3000`.

### Verificación de Tipos y Compilación Producción
```bash
npm run typecheck
npm run build
npm start
```

### Pruebas Automatizadas
```bash
npm test
```

---

## 6. Evidencia de Respuestas del Servicio REST (Ejemplos cURL)

### A. Flujo Feliz: Cancelar Envío en Almacén (HU-01 / 200 OK)
```bash
curl -X PATCH http://localhost:3000/envios/11111111-1111-4111-8111-111111111111/estado \
  -H 'Content-Type: application/json' \
  -d '{
    "estado": "CANCELLED",
    "motivo_cancelacion": "Cancelación solicitada por el cliente antes del envío",
    "usuario_responsable": "operador-01"
  }'
```

### B. Error por Regla de Negocio: Intentar Cancelar Envío en Ruta (HU-01 / 409 Conflict)
```bash
curl -X PATCH http://localhost:3000/envios/33333333-3333-4333-8333-333333333333/estado \
  -H 'Content-Type: application/json' \
  -d '{
    "estado": "CANCELLED",
    "motivo_cancelacion": "Intento de cancelación con el camión en tránsito",
    "usuario_responsable": "operador-01"
  }'
```

### C. Cancelación de Orden Pagada con Generación de Nota de Crédito (HU-03 / 200 OK)
```bash
curl -X PATCH http://localhost:3000/envios/55555555-5555-4555-8555-555555555555/estado \
  -H 'Content-Type: application/json' \
  -d '{
    "estado": "CANCELLED",
    "motivo_cancelacion": "Devolución con reembolso",
    "usuario_responsable": "operador-01",
    "monto_nota_credito": 99.99
  }'
```