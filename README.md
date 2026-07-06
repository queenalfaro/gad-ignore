# gad-ignore

Минималистичный Cloudflare Worker для быстрого получения и объединения шаблонов `.gitignore` и `.dockerignore`. Окружение определяет целевой формат по субдомену и возвращает готовое содержимое в текстовом формате.

## Ссылки

*   **Dockerignore**: [https://di.queenalfaro.workers.dev/](https://di.queenalfaro.workers.dev/)
*   **Gitignore**: [https://gi.queenalfaro.workers.dev/](https://gi.queenalfaro.workers.dev/)

## Использование

Для получения шаблонов добавьте их названия через запятую в путь URL.

### 1. Генерация `.gitignore` (Субдомен `gi`)
Проксирует запросы к API сервиса `gitignore.io`.

```bash
curl https://gi.queenalfaro.workers.dev/node,python,visualstudiocode > .gitignore
```

### 2. Генерация `.dockerignore` (Субдомен `di`)
Ищет шаблоны на `dockerignore.com`, парсит HTML-код и возвращает объединенный файл конфигурации.

```bash
curl https://di.queenalfaro.workers.dev/node,python > .dockerignore
```

---

## Архитектура работы

1.  **Определение типа запроса**: На основе субдомена (`gi`, `g`, `git`, `gitignore` для git; `di`, `d`, `docker`, `dockerignore` для docker).
2.  **Обработка Gitignore**: Выполняется прямой `fetch` к `gitignore.io/api/...`.
3.  **Обработка Dockerignore**:
    *   Загружается и анализируется XML-карта сайта `dockerignore.com`.
    *   Находятся совпадения для переданных в пути шаблонов.
    *   Параллельно запрашиваются страницы найденных шаблонов.
    *   С помощью `HTMLRewriter` извлекается текстовое содержимое элементов `code.language-dockerignore`.
    *   Конфигурации объединяются в один ответ.
