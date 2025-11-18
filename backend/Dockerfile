FROM composer:2 AS vendor

WORKDIR /app

# Copia tudo (funciona tanto no Railway quanto local)
# Railway: contexto é raiz, então copia tudo para temp e detecta backend/
# Local: contexto é backend/, então copia tudo direto
COPY . ./temp-context/

# Script que detecta qual caminho tem os arquivos e os copia para o WORKDIR
RUN if [ -f ./temp-context/backend/composer.json ]; then \
    # Contexto Railway: composer.json está em backend/
    cp ./temp-context/backend/composer.json ./temp-context/backend/composer.lock ./ 2>/dev/null || \
    cp ./temp-context/backend/composer.json ./; \
    elif [ -f ./temp-context/composer.json ]; then \
    # Contexto local: composer.json está na raiz do contexto
    cp ./temp-context/composer.json ./temp-context/composer.lock ./ 2>/dev/null || \
    cp ./temp-context/composer.json ./; \
    else \
    echo "ERROR: composer.json not found in backend/ or root" && exit 1; \
    fi && \
    rm -rf ./temp-context

RUN composer install --no-dev --optimize-autoloader --no-interaction --no-ansi --no-scripts

FROM php:8.2-cli

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
    git \
    unzip \
    libpq-dev \
    bash \
    && docker-php-ext-install pdo pdo_pgsql pcntl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /var/www/html

COPY --from=vendor /app/vendor ./vendor

# Copia o código: funciona tanto no Railway (contexto raiz) quanto local (contexto backend/)
# Railway: contexto é raiz, então copia backend/ para a raiz
# Local: contexto é backend/, então copia . para a raiz
# Usa RUN para detectar qual contexto estamos usando
COPY . ./temp-context/

# Move os arquivos do contexto correto para a raiz
RUN if [ -d ./temp-context/backend ]; then \
    # Contexto Railway: move backend/ para raiz
    mv ./temp-context/backend/* ./temp-context/backend/.[!.]* . 2>/dev/null || true; \
    else \
    # Contexto local: move tudo de temp-context para raiz
    mv ./temp-context/* ./temp-context/.[!.]* . 2>/dev/null || true; \
    fi && \
    rm -rf ./temp-context

ENV APP_ENV=production
ENV APP_DEBUG=false
ENV APP_PORT=8000

EXPOSE 8000

CMD ["sh", "-c", "php artisan migrate --force && php artisan serve --host=0.0.0.0 --port=${APP_PORT}"]


