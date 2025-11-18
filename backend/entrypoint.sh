#!/bin/bash
set -e

# Garante que estamos no diretório correto
cd /var/www/html

# Executa as migrações
php artisan migrate --force

# Inicia o servidor
exec php artisan serve --host=0.0.0.0 --port=${APP_PORT:-8000}

