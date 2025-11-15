#!/bin/bash

# Script para probar el webhook de Hotmart

echo "🧪 Probando Webhook de Hotmart..."
echo ""

# Configuración
API_URL="http://localhost:3003/api/webhooks/hotmart"
API_KEY="tu_clave_super_secreta_aqui_cambiala"

# Test 1: Verificar que el endpoint está activo
echo "📡 Test 1: Verificar endpoint..."
curl -s $API_URL | jq .
echo ""

# Test 2: Probar asignación de curso por CÓDIGO (RECOMENDADO)
echo "🔢 Test 2: Asignar curso por código..."
curl -X POST $API_URL \
  -H "Content-Type: application/json" \
  -H "x-api-key: $API_KEY" \
  -d '{
    "email": "test@ejemplo.com",
    "name": "Usuario de Prueba Webhook",
    "course_code": 1,
    "transaction_id": "TEST_WEBHOOK_CODE_001"
  }' | jq .
echo ""

# Test 3: Probar asignación de curso por TÍTULO
echo "📚 Test 3: Asignar curso por título..."
curl -X POST $API_URL \
  -H "Content-Type: application/json" \
  -H "x-api-key: $API_KEY" \
  -d '{
    "email": "test2@ejemplo.com",
    "name": "Usuario de Prueba Webhook 2",
    "course_title": "CURSO PRUEBA SQL",
    "transaction_id": "TEST_WEBHOOK_TITLE_001"
  }' | jq .
echo ""

echo "✅ Pruebas completadas!"
echo ""
echo "💡 Para ver los cursos asignados, ve a Supabase y ejecuta:"
echo "   SELECT * FROM user_courses WHERE hotmart_transaction_id LIKE 'TEST_WEBHOOK%';"
echo ""
echo "💡 Para ver los códigos de tus cursos:"
echo "   SELECT course_code, title FROM courses ORDER BY course_code;"
