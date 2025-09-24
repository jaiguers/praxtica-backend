# API de Planes y Pagos

## Endpoints de Planes

### Obtener todos los planes (Público)
```
GET /api/plans
```
Retorna todos los planes activos disponibles.

### Obtener plan por ID (Público)
```
GET /api/plans/:id
```
Retorna un plan específico por su ID.

### Crear plan (Requiere autenticación)
```
POST /api/plans
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "Plan Mensual",
  "type": "monthly",
  "items": ["Desafíos ilimitados", "Soporte prioritario", "Certificados"],
  "price": 29900
}
```

### Actualizar plan (Requiere autenticación)
```
PUT /api/plans/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "Plan Mensual Actualizado",
  "price": 34900
}
```

### Eliminar plan (Requiere autenticación)
```
DELETE /api/plans/:id
Authorization: Bearer <token>
```

## Endpoints de Pagos

### Crear pago (Requiere autenticación)
```
POST /api/payments
Authorization: Bearer <token>
Content-Type: application/json

{
  "planId": "64f8a1b2c3d4e5f6a7b8c9d0",
  "paymentMethod": "credit_card",
  "amount": 29900,
  "currency": "COP"
}
```

### Obtener todos los pagos (Requiere autenticación)
```
GET /api/payments
Authorization: Bearer <token>
```

### Obtener mis pagos (Requiere autenticación)
```
GET /api/payments/my-payments
Authorization: Bearer <token>
```

### Obtener pago por ID (Requiere autenticación)
```
GET /api/payments/:id
Authorization: Bearer <token>
```

### Obtener pago por referencia (Requiere autenticación)
```
GET /api/payments/reference/:reference
Authorization: Bearer <token>
```

### Actualizar pago (Requiere autenticación)
```
PUT /api/payments/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "status": "completed",
  "transactionId": "txn_123456789"
}
```

### Generar firma de pago (Requiere autenticación)
```
POST /api/payments/generate-signature/:planId
Authorization: Bearer <token>
```

## Variables de Entorno Requeridas

Para el funcionamiento de la generación de firmas de pago, se requieren las siguientes variables de entorno:

```env
# Para desarrollo
WOMPI_INTEGRITY_TEST_KEY=tu_clave_test_aqui

# Para producción
WOMPI_INTEGRITY_KEY=tu_clave_produccion_aqui
```

## Tipos de Planes

- `free`: Plan gratuito
- `monthly`: Plan mensual
- `annual`: Plan anual
- `enterprise`: Plan empresarial

## Estados de Pago

- `pending`: Pendiente
- `completed`: Completado
- `failed`: Fallido
- `cancelled`: Cancelado

## Funcionalidades Automáticas

1. **Actualización de suscripción**: Cuando un pago se marca como `completed`, automáticamente se actualiza la suscripción del usuario.
2. **Generación de referencias**: Cada pago recibe una referencia única (UUID).
3. **Cálculo de fechas**: Las fechas de finalización se calculan automáticamente según el tipo de plan.
4. **Firma de integridad**: Se genera una firma SHA256 para validación de pagos con Wompi.
