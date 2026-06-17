# API Testing Examples (cURL Manual)

This guide provides command line examples to test the newly created REST endpoints using `cURL`.

---

## 1. Authentication

### Login as Admin
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@dormitory.com", "password": "Password123"}'
```
> Capture the `accessToken` from the JSON response to use in the subsequent headers.

### Login as Student
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "student@dormitory.com", "password": "Password123"}'
```

---

## 2. Invoices Module

### Get All Invoices
```bash
curl -X GET "http://localhost:5000/api/invoices?page=1&limit=10" \
  -H "Authorization: Bearer <accessToken>"
```

### Create Manual Invoice (Admin/Staff Only)
```bash
curl -X POST http://localhost:5000/api/invoices \
  -H "Authorization: Bearer <accessToken>" \
  -H "Content-Type: application/json" \
  -d '{
    "roomId": "<roomId>",
    "contractId": "<contractId>",
    "billingMonth": 6,
    "billingYear": 2026,
    "roomFee": 1200000,
    "electricityFee": 350000,
    "waterFee": 150000,
    "serviceFee": 50000,
    "totalAmount": 1750000,
    "paymentStatus": "UNPAID",
    "dueDate": "2026-06-25T00:00:00.000Z"
  }'
```

### Update Invoice Payment Status
```bash
curl -X PUT http://localhost:5000/api/invoices/<invoiceId> \
  -H "Authorization: Bearer <accessToken>" \
  -H "Content-Type: application/json" \
  -d '{
    "paymentStatus": "PAID",
    "paidDate": "2026-06-16T00:00:00.000Z"
  }'
```

### Get Revenue Statistics (Admin Only)
```bash
curl -X GET http://localhost:5000/api/invoices/statistics \
  -H "Authorization: Bearer <accessToken>"
```

### Export Invoice History to Excel (Admin Only)
```bash
curl -X GET "http://localhost:5000/api/invoices/export/excel?reportType=history" \
  -H "Authorization: Bearer <accessToken>" \
  --output InvoiceHistory.xlsx
```

### Export Invoice Detail to PDF (All Authenticated)
```bash
curl -X GET "http://localhost:5000/api/invoices/export/pdf?id=<invoiceId>" \
  -H "Authorization: Bearer <accessToken>" \
  --output InvoiceDetail.pdf
```

---

## 3. Utilities Module

### Get All Utility Readings
```bash
curl -X GET "http://localhost:5000/api/utilities?page=1&limit=10" \
  -H "Authorization: Bearer <accessToken>"
```

### Register Utility Reading (Admin/Staff Only)
```bash
curl -X POST http://localhost:5000/api/utilities \
  -H "Authorization: Bearer <accessToken>" \
  -H "Content-Type: application/json" \
  -d '{
    "roomId": "<roomId>",
    "billingMonth": 6,
    "billingYear": 2026,
    "previousElectric": 1260,
    "currentElectric": 1420,
    "previousWater": 428,
    "currentWater": 445,
    "electricPrice": 3500,
    "waterPrice": 15000
  }'
```

### Auto Generate Invoice from Registered Reading (Admin/Staff Only)
```bash
curl -X POST http://localhost:5000/api/invoices/generate \
  -H "Authorization: Bearer <accessToken>" \
  -H "Content-Type: application/json" \
  -d '{
    "roomId": "<roomId>",
    "billingMonth": 6,
    "billingYear": 2026,
    "serviceFee": 50000
  }'
```

### Estimate Utility Cost (Before Save)
```bash
curl -X POST http://localhost:5000/api/utilities/calculate \
  -H "Authorization: Bearer <accessToken>" \
  -H "Content-Type: application/json" \
  -d '{
    "roomFee": 1200000,
    "previousElectric": 1260,
    "currentElectric": 1420,
    "previousWater": 428,
    "currentWater": 445,
    "electricPrice": 3500,
    "waterPrice": 15000,
    "serviceFee": 50000
  }'
```

### Delete Utility Reading (Admin Only)
```bash
curl -X DELETE http://localhost:5000/api/utilities/<readingId> \
  -H "Authorization: Bearer <accessToken>"
```
