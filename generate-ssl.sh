#!/bin/bash

# Crear directorio SSL si no existe
mkdir -p ssl

# Generar clave privada
openssl genrsa -out ssl/private-key.pem 2048

# Generar certificado auto-firmado
openssl req -new -key ssl/private-key.pem -out ssl/certificate.pem -subj "/C=MX/ST=CDMX/L=CDMX/O=Padel/OU=IT/CN=localhost"

# Generar certificado auto-firmado válido por 365 días
openssl x509 -req -days 365 -in ssl/certificate.pem -signkey ssl/private-key.pem -out ssl/certificate.pem

echo "Certificados SSL generados exitosamente en el directorio ssl/"
