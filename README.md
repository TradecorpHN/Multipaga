# Estructura Completa de Carpetas - Hyperswitch Next.js App

```
multipaga/
├── .env.local                           # Variables de entorno locales
├── .env.example                         # Plantilla de variables de entorno
├── .eslintrc.json                       # Configuración de ESLint
├── .gitignore                           # Archivos ignorados por Git
├── .prettierrc.json                     # Configuración de Prettier
├── next.config.js                       # Configuración de Next.js
├── package.json                         # Dependencias y scripts
├── postcss.config.js                    # Configuración de PostCSS
├── README.md                            # Documentación del proyecto
├── tailwind.config.ts                   # Configuración de Tailwind CSS
├── tsconfig.json                        # Configuración de TypeScript
│
├── public/                              # Archivos estáticos públicos
│   ├── favicon.ico                      # Icono del sitio
│   ├── logo.svg                         # Logo principal de la app
│   └── resources/                       # Recursos estáticos
│       ├── backgrounds/                 # Fondos 3D
│       │   ├── grid-pattern.svg         # Patrón de grid para fondos
│       │   ├── gradient-mesh.webp       # Gradiente mesh Web3
│       │   └── stars-field.webp         # Campo de estrellas
│       └── connectors/                  # Logos de conectores (MAYÚSCULAS)
│           ├── STRIPE.svg               # Logo de Stripe
│           ├── PAYPAL.svg               # Logo de PayPal
│           ├── ADYEN.svg                # Logo de Adyen
│           ├── CHECKOUT.svg             # Logo de Checkout.com
│           ├── PAYEEZY.svg              # Logo de Payeezy
│           ├── BRAINTREE.svg            # Logo de Braintree
│           ├── KLARNA.svg               # Logo de Klarna
│           ├── WORLDPAY.svg             # Logo de Worldpay
│           ├── MULTISAFEPAY.svg         # Logo de MultiSafepay
│           ├── BLUESNAP.svg             # Logo de BlueSnap
│           ├── NUVEI.svg                # Logo de Nuvei
│           ├── PAYU.svg                 # Logo de PayU
│           ├── TRUSTPAY.svg             # Logo de TrustPay
│           ├── CYBERSOURCE.svg          # Logo de Cybersource
│           ├── SHIFT4.svg               # Logo de Shift4
│           ├── RAPYD.svg                # Logo de Rapyd
│           ├── FISERV.svg               # Logo de Fiserv
│           ├── HELCIM.svg               # Logo de Helcim
│           ├── IATAPAY.svg              # Logo de IATAPay
│           ├── GLOBALPAY.svg            # Logo de GlobalPay
│           ├── WORLDLINE.svg            # Logo de Worldline
│           ├── STAX.svg                 # Logo de Stax
│           ├── NETNAXEPT.svg            # Logo de Nets/Nexept
│           ├── NMI.svg                  # Logo de NMI
│           ├── PAYONE.svg               # Logo de Payone
│           ├── WISE.svg                 # Logo de Wise
│           ├── TSYS.svg                 # Logo de TSYS
│           └── PLACEHOLDER.svg          # Logo placeholder para nuevos
│
├── src/                                 # Código fuente principal
│   ├── domain/                          # Capa de dominio (lógica de negocio pura)
│   │   ├── entities/                    # Entidades del dominio
│   │   │   ├── Payment.ts               # Entidad Payment
│   │   │   ├── Refund.ts                # Entidad Refund
│   │   │   ├── Dispute.ts               # Entidad Dispute
│   │   │   ├── Transaction.ts           # Entidad Transaction
│   │   │   ├── Connector.ts             # Entidad Connector
│   │   │   ├── PaymentMethod.ts         # Entidad PaymentMethod
│   │   │   ├── Customer.ts              # Entidad Customer
│   │   │   ├── MerchantProfile.ts       # Entidad MerchantProfile
│   │   │   └── ReconciliationRecord.ts  # Entidad ReconciliationRecord
│   │   ├── value-objects/               # Objetos de valor
│   │   │   ├── Money.ts                 # VO para cantidades monetarias
│   │   │   ├── Currency.ts              # VO para códigos de moneda
│   │   │   ├── PaymentStatus.ts         # VO para estados de pago
│   │   │   ├── RefundStatus.ts          # VO para estados de reembolso
│   │   │   ├── DisputeStatus.ts         # VO para estados de disputa
│   │   │   ├── ConnectorType.ts         # VO para tipos de conector
│   │   │   └── DateRange.ts             # VO para rangos de fecha
│   │   └── repositories/                # Interfaces de repositorios
│   │       ├── IPaymentRepository.ts    # Interface para pagos
│   │       ├── IRefundRepository.ts     # Interface para reembolsos
│   │       ├── IDisputeRepository.ts    # Interface para disputas
│   │       ├── IConnectorRepository.ts  # Interface para conectores
│   │       └── IProfileRepository.ts    # Interface para perfiles
│   │
│   ├── application/                     # Capa de aplicación (casos de uso)
│   │   ├── use-cases/                   # Casos de uso
│   │   │   ├── auth/                    # Casos de uso de autenticación
│   │   │   │   ├── LoginWithMerchantId.ts      # Login con merchant_id
│   │   │   │   ├── ValidateProfileAccess.ts    # Validar acceso a profile
│   │   │   │   └── RefreshSession.ts           # Refrescar sesión
│   │   │   ├── payments/                # Casos de uso de pagos
│   │   │   │   ├── CreatePayment.ts             # Crear pago
│   │   │   │   ├── ListPayments.ts              # Listar pagos
│   │   │   │   ├── GetPaymentDetails.ts         # Obtener detalles de pago
│   │   │   │   ├── CapturePayment.ts            # Capturar pago
│   │   │   │   ├── CancelPayment.ts             # Cancelar pago
│   │   │   │   └── UpdatePayment.ts             # Actualizar pago
│   │   │   ├── refunds/                 # Casos de uso de reembolsos
│   │   │   │   ├── CreateRefund.ts              # Crear reembolso
│   │   │   │   ├── ListRefunds.ts               # Listar reembolsos
│   │   │   │   ├── GetRefundDetails.ts          # Obtener detalles
│   │   │   │   └── UpdateRefund.ts              # Actualizar reembolso
│   │   │   ├── disputes/                # Casos de uso de disputas
│   │   │   │   ├── ListDisputes.ts              # Listar disputas
│   │   │   │   ├── GetDisputeDetails.ts         # Obtener detalles
│   │   │   │   ├── AcceptDispute.ts             # Aceptar disputa
│   │   │   │   └── ChallengeDispute.ts          # Desafiar disputa
│   │   │   ├── connectors/              # Casos de uso de conectores
│   │   │   │   ├── ListConnectors.ts            # Listar conectores
│   │   │   │   ├── GetConnectorMethods.ts       # Obtener métodos de pago
│   │   │   │   └── GetConnectorBalance.ts       # Obtener balance
│   │   │   └── reconciliation/          # Casos de uso de conciliación
│   │   │       ├── GetReconciliationStatus.ts   # Estado de conciliación
│   │   │       └── ListReconciliationRecords.ts # Listar registros
│   │   ├── ports/                       # Puertos (interfaces de infra)
│   │   │   ├── IHttpClient.ts           # Interface para cliente HTTP
│   │   │   ├── ILogger.ts               # Interface para logging
│   │   │   ├── ICache.ts                # Interface para caché
│   │   │   └── IEventBus.ts             # Interface para eventos
│   │   └── dtos/                        # Data Transfer Objects
│   │       ├── PaymentCreateDTO.ts      # DTO para crear pago
│   │       ├── RefundCreateDTO.ts       # DTO para crear reembolso
│   │       ├── DisputeResponseDTO.ts    # DTO de respuesta disputa
│   │       └── ConnectorListDTO.ts      # DTO lista de conectores
│   │
│   ├── infrastructure/                  # Capa de infraestructura
│   │   ├── api/                         # Clientes API
│   │   │   ├── HyperswitchClient.ts     # Cliente principal de Hyperswitch
│   │   │   ├── interceptors/            # Interceptores de peticiones
│   │   │   │   ├── AuthInterceptor.ts   # Añade headers de auth
│   │   │   │   ├── LoggingInterceptor.ts # Logging de peticiones
│   │   │   │   └── RetryInterceptor.ts  # Reintentos automáticos
│   │   │   └── endpoints/               # Definición de endpoints
│   │   │       ├── PaymentEndpoints.ts  # Endpoints de pagos
│   │   │       ├── RefundEndpoints.ts   # Endpoints de reembolsos
│   │   │       ├── DisputeEndpoints.ts  # Endpoints de disputas
│   │   │       └── ProfileEndpoints.ts  # Endpoints de perfiles
│   │   ├── repositories/                # Implementación de repositorios
│   │   │   ├── HttpPaymentRepository.ts # Repo de pagos via HTTP
│   │   │   ├── HttpRefundRepository.ts  # Repo de reembolsos via HTTP
│   │   │   ├── HttpDisputeRepository.ts # Repo de disputas via HTTP
│   │   │   └── HttpConnectorRepository.ts # Repo de conectores via HTTP
│   │   ├── logging/                     # Sistema de logging
│   │   │   ├── WinstonLogger.ts         # Logger con Winston
│   │   │   ├── SentryErrorReporter.ts   # Reporte de errores a Sentry
│   │   │   └── LoggerFactory.ts         # Factory para loggers
│   │   ├── security/                    # Seguridad y validación
│   │   │   ├── HeaderValidator.ts       # Validación de headers
│   │   │   ├── RateLimiter.ts           # Rate limiting
│   │   │   └── CorsManager.ts           # Gestión de CORS
│   │   └── cache/                       # Sistema de caché
│   │       ├── MemoryCache.ts           # Caché en memoria
│   │       └── CacheKeys.ts              # Llaves de caché
│   │
│   └── presentation/                    # Capa de presentación (Next.js + React)
│       ├── lib/                         # Utilidades y configuración
│       │   ├── axios-config.ts          # Configuración de Axios
│       │   ├── env-config.ts            # Validación de env con Zod
│       │   ├── constants.ts             # Constantes de la app
│       │   └── utils/                   # Utilidades generales
│       │       ├── formatters.ts        # Formateo de datos
│       │       ├── validators.ts        # Validadores con Zod
│       │       └── dates.ts             # Utilidades de fechas
│       ├── hooks/                       # Custom React hooks
│       │   ├── useAuth.ts               # Hook de autenticación
│       │   ├── usePayments.ts           # Hook para pagos
│       │   ├── useRefunds.ts            # Hook para reembolsos
│       │   ├── useDisputes.ts           # Hook para disputas
│       │   ├── useConnectors.ts         # Hook para conectores
│       │   ├── useDebounce.ts           # Hook de debounce
│       │   └── useInfiniteScroll.ts     # Hook scroll infinito
│       ├── contexts/                    # React Contexts
│       │   ├── AuthContext.tsx          # Context de autenticación
│       │   ├── MerchantContext.tsx      # Context merchant_id/profile_id
│       │   ├── ConnectorContext.tsx     # Context de conectores
│       │   └── ThemeContext.tsx         # Context de tema (dark/light)
│       ├── components/                  # Componentes React
│       │   ├── ui/                      # Componentes UI base
│       │   │   ├── Button.tsx           # Botón neumórfico
│       │   │   ├── Card.tsx             # Card neumórfico
│       │   │   ├── Input.tsx            # Input neumórfico
│       │   │   ├── Select.tsx           # Select personalizado
│       │   │   ├── Modal.tsx            # Modal reutilizable
│       │   │   ├── Toast.tsx            # Notificaciones toast
│       │   │   ├── Spinner.tsx          # Spinner de carga
│       │   │   ├── Badge.tsx            # Badge para estados
│       │   │   ├── Tabs.tsx             # Tabs navegables
│       │   │   ├── Table.tsx            # Tabla con sorting
│       │   │   ├── Pagination.tsx       # Paginación
│       │   │   └── Tooltip.tsx          # Tooltips informativos
│       │   ├── layout/                  # Componentes de layout
│       │   │   ├── DashboardLayout.tsx  # Layout principal dashboard
│       │   │   ├── Sidebar.tsx          # Sidebar navegación
│       │   │   ├── Header.tsx           # Header con info usuario
│       │   │   ├── Footer.tsx           # Footer minimalista
│       │   │   └── PageContainer.tsx    # Container para páginas
│       │   ├── three/                   # Componentes 3D
│       │   │   ├── AnimatedBackground.tsx # Fondo 3D animado
│       │   │   ├── IcosahedronMesh.tsx  # Icosaedro wobbling
│       │   │   ├── StarsField.tsx       # Campo de estrellas
│       │   │   └── shaders/             # Shaders personalizados
│       │   │       ├── wobble.glsl      # Shader wobble
│       │   │       └── gradient.glsl    # Shader gradiente
│       │   ├── forms/                   # Componentes de formulario
│       │   │   ├── PaymentForm.tsx      # Form crear pago
│       │   │   ├── RefundForm.tsx       # Form crear reembolso
│       │   │   ├── DisputeForm.tsx      # Form gestionar disputa
│       │   │   ├── FormField.tsx        # Campo de form genérico
│       │   │   └── validation/          # Esquemas Zod
│       │   │       ├── payment.schema.ts # Validación pagos
│       │   │       ├── refund.schema.ts  # Validación reembolsos
│       │   │       └── auth.schema.ts    # Validación auth
│       │   ├── payments/                # Componentes de pagos
│       │   │   ├── PaymentList.tsx      # Lista de pagos
│       │   │   ├── PaymentCard.tsx      # Card de pago
│       │   │   ├── PaymentDetails.tsx   # Detalles de pago
│       │   │   ├── PaymentStatus.tsx    # Badge de estado
│       │   │   └── PaymentFilters.tsx   # Filtros de búsqueda
│       │   ├── refunds/                 # Componentes de reembolsos
│       │   │   ├── RefundList.tsx       # Lista de reembolsos
│       │   │   ├── RefundCard.tsx       # Card de reembolso
│       │   │   ├── RefundDetails.tsx    # Detalles de reembolso
│       │   │   └── RefundTimeline.tsx   # Timeline de estados
│       │   ├── disputes/                # Componentes de disputas
│       │   │   ├── DisputeList.tsx      # Lista de disputas
│       │   │   ├── DisputeCard.tsx      # Card de disputa
│       │   │   ├── DisputeDetails.tsx   # Detalles de disputa
│       │   │   └── DisputeActions.tsx   # Acciones de disputa
│       │   ├── connectors/              # Componentes de conectores
│       │   │   ├── ConnectorGrid.tsx    # Grid de conectores
│       │   │   ├── ConnectorCard.tsx    # Card de conector
│       │   │   ├── ConnectorLogo.tsx    # Logo dinámico
│       │   │   └── PaymentMethods.tsx   # Métodos de pago
│       │   ├── dashboard/               # Componentes del dashboard
│       │   │   ├── OverviewStats.tsx    # Estadísticas generales
│       │   │   ├── BalanceChart.tsx     # Gráfico de balance
│       │   │   ├── RecentActivity.tsx   # Actividad reciente
│       │   │   └── QuickActions.tsx     # Acciones rápidas
│       │   └── reconciliation/          # Componentes conciliación
│       │       ├── ReconciliationList.tsx    # Lista de registros
│       │       ├── ReconciliationStatus.tsx  # Estado actual
│       │       └── ReconciliationFilters.tsx # Filtros
│       └── styles/                      # Estilos globales
│           ├── globals.css              # CSS global y Tailwind
│           ├── animations.css           # Animaciones personalizadas
│           └── neumorphism.css          # Estilos neumórficos
│
├── app/                                 # App Router de Next.js
│   ├── (auth)/                          # Grupo de rutas auth
│   │   ├── login/                       # Página de login
│   │   │   ├── page.tsx                 # Componente página
│   │   │   └── loading.tsx              # Estado de carga
│   │   └── layout.tsx                   # Layout para auth
│   ├── (dashboard)/                     # Grupo de rutas dashboard
│   │   ├── layout.tsx                   # Layout del dashboard
│   │   ├── page.tsx                     # Overview (home)
│   │   ├── connectors/                  # Página conectores
│   │   │   ├── page.tsx                 # Lista de conectores
│   │   │   └── [id]/                    # Detalle conector
│   │   │       └── page.tsx             # Página detalle
│   │   ├── payments/                    # Página pagos
│   │   │   ├── page.tsx                 # Lista de pagos
│   │   │   ├── create/                  # Crear pago
│   │   │   │   └── page.tsx             # Form crear pago
│   │   │   └── [id]/                    # Detalle pago
│   │   │       ├── page.tsx             # Página detalle
│   │   │       └── loading.tsx          # Estado carga
│   │   ├── refunds/                     # Página reembolsos
│   │   │   ├── page.tsx                 # Lista de reembolsos
│   │   │   ├── create/                  # Crear reembolso
│   │   │   │   └── page.tsx             # Form crear reembolso
│   │   │   └── [id]/                    # Detalle reembolso
│   │   │       └── page.tsx             # Página detalle
│   │   ├── transactions/                # Página transacciones
│   │   │   ├── page.tsx                 # Lista transacciones
│   │   │   └── [id]/                    # Detalle transacción
│   │   │       └── page.tsx             # Página detalle
│   │   ├── disputes/                    # Página disputas
│   │   │   ├── page.tsx                 # Lista de disputas
│   │   │   └── [id]/                    # Detalle disputa
│   │   │       ├── page.tsx             # Página detalle
│   │   │       └── challenge/           # Desafiar disputa
│   │   │           └── page.tsx         # Form desafío
│   │   └── reconciliation/              # Página conciliación
│   │       └── page.tsx                 # Estado conciliación
│   ├── api/                             # API Routes
│   │   ├── hyperswitch/                 # Proxy para Hyperswitch
│   │   │   └── [...path]/               # Catch-all route
│   │   │       └── route.ts             # Handler del proxy
│   │   ├── auth/                        # Endpoints de auth
│   │   │   ├── login/                   # Login endpoint
│   │   │   │   └── route.ts             # POST handler
│   │   │   ├── logout/                  # Logout endpoint
│   │   │   │   └── route.ts             # POST handler
│   │   │   └── refresh/                 # Refresh token
│   │   │       └── route.ts             # POST handler
│   │   └── health/                      # Health check
│   │       └── route.ts                 # GET handler
│   ├── layout.tsx                       # Root layout
│   ├── error.tsx                        # Error boundary
│   ├── not-found.tsx                    # 404 page
│   └── providers.tsx                    # Client providers
│
├── middleware.ts                        # Middleware Next.js
├── tests/                               # Tests
│   ├── unit/                            # Tests unitarios
│   │   ├── domain/                      # Tests dominio
│   │   ├── application/                 # Tests aplicación
│   │   └── infrastructure/              # Tests infra
│   ├── integration/                     # Tests integración
│   │   └── api/                         # Tests API
│   └── e2e/                             # Tests E2E
│       └── cypress/                     # Cypress tests
│
└── docs/                                # Documentación
    ├── architecture.md                  # Arquitectura detallada
    ├── api-integration.md               # Guía integración API
    ├── deployment.md                    # Guía de despliegue
    └── troubleshooting.md               # Solución de problemas
```

## Descripción de Responsabilidades por Capa

### 1. **Domain Layer** (`src/domain/`)
- **entities/**: Modelos de negocio puros sin dependencias externas
- **value-objects/**: Objetos inmutables que representan conceptos del dominio
- **repositories/**: Interfaces que definen contratos para acceso a datos

### 2. **Application Layer** (`src/application/`)
- **use-cases/**: Orquestación de la lógica de negocio
- **ports/**: Interfaces para servicios externos
- **dtos/**: Objetos para transferencia de datos entre capas

### 3. **Infrastructure Layer** (`src/infrastructure/`)
- **api/**: Implementación del cliente HTTP para Hyperswitch
- **repositories/**: Implementación concreta de los repositorios
- **logging/**: Sistema de logs y monitoreo
- **security/**: Middleware de seguridad y validación

### 4. **Presentation Layer** (`src/presentation/`)
- **components/**: Componentes React reutilizables
- **hooks/**: Custom hooks para lógica de UI
- **contexts/**: Estado global de la aplicación
- **lib/**: Utilidades y configuración

### 5. **App Router** (`app/`)
- **(auth)/**: Rutas públicas de autenticación
- **(dashboard)/**: Rutas protegidas del dashboard
- **api/**: API Routes que actúan como proxy

## Configuración de Variables de Entorno

```env
# .env.local
HYPERSWITCH_API_KEY=your_api_key_here
HYPERSWITCH_BASE_URL=https://sandbox.hyperswitch.io
NEXT_PUBLIC_APP_URL=http://localhost:3000
SENTRY_DSN=your_sentry_dsn_here
```

## Notas Importantes

1. **Proxy Pattern**: Todas las peticiones pasan por `/api/hyperswitch/[...path]` para mantener las credenciales seguras
2. **No Data Persistence**: La app no guarda datos localmente, todo se obtiene de la API
3. **Dynamic Connectors**: Los logos se cargan dinámicamente basándose en la respuesta de la API
4. **3D Background**: El fondo usa React-Three-Fiber con un icosaedro animado
5. **Security**: CORS, rate-limiting y validación de headers implementados en middleware
6. **Type Safety**: Uso de Zod para validación runtime y TypeScript para type checking