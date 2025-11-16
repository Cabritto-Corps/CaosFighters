FROM composer:2 AS vendor

WORKDIR /app

# Copia tudo (funciona tanto no Railway quanto local)
# No Railway: copia backend/composer.json e backend/composer.lock
# Local: copia composer.json e composer.lock direto
COPY backend/ ./backend/
COPY composer.json* composer.lock* ./

# Script que detecta qual caminho tem os arquivos e os copia para o WORKDIR
RUN if [ -f backend/composer.json ]; then \
        cp backend/composer.json backend/composer.lock ./; \
    elif [ -f composer.json ]; then \
        cp composer.json composer.lock ./; \
    else \
        echo "ERROR: composer.json not found in backend/ or root" && exit 1; \
    fi

RUN composer install --no-dev --optimize-autoloader --no-interaction --no-ansi --no-scripts

FROM php:8.2-cli

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        git \
        unzip \
        libpq-dev \
    && docker-php-ext-install pdo pdo_pgsql pcntl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /var/www/html

COPY --from=vendor /app/vendor ./vendor

# Copia o código: funciona tanto no Railway (contexto raiz) quanto local (contexto backend/)
# Copia ambos os possíveis caminhos - um vai existir dependendo do contexto
COPY backend/ ./backend-temp/ 2>/dev/null || true
COPY . ./

# Se copiamos backend-temp/, move o conteúdo para a raiz
RUN if [ -d ./backend-temp ] && [ "$(ls -A ./backend-temp 2>/dev/null)" ]; then \
        mv ./backend-temp/* ./backend-temp/.[!.]* . 2>/dev/null || true; \
        rm -rf ./backend-temp; \
    fi

ENV APP_ENV=production
ENV APP_DEBUG=false
ENV APP_PORT=8000

EXPOSE 8000

CMD php artisan migrate --force && php artisan serve --host=0.0.0.0 --port=${APP_PORT}


