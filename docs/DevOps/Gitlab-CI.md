# GitLab CI/CD

## Що таке GitLab CI/CD?
Вбудований інструмент GitLab для автоматизації процесів збірки, тестування та розгортання програмного забезпечення. Керується файлом `.gitlab-ci.yml` у корені репозиторію.

## Основні Переваги
Тісна інтеграція з GitLab (репозиторії, Merge Requests, реєстр контейнерів). Простота конфігурації через YAML. Вбудовані функції безпеки (SAST, DAST). Гнучкість завдяки Runners.

# Ключові Компоненти

## Файл Конфігурації (`.gitlab-ci.yml`)
Основний YAML-файл, що визначає структуру конвеєрів (pipelines): етапи (stages), завдання (jobs) та правила їх виконання.

::: details Приклад базового `.gitlab-ci.yml`
```yaml
# Визначення послідовності етапів
stages:
  - build
  - test
  - deploy

# Приклад завдання на етапі "build"
build_job:
  stage: build # Прив'язка до етапу
  script: # Команди для виконання
    - echo "Building the project..."
    - mkdir build
    - touch build/info.txt
  artifacts: # Збереження результатів
    paths:
      - build/

# Приклад завдання на етапі "test"
test_job:
  stage: test
  script:
    - echo "Running tests..."
    - test -f build/info.txt # Перевірка наявності артефакту з попереднього етапу

# Приклад завдання на етапі "deploy"
deploy_job:
  stage: deploy
  script:
    - echo "Deploying application..."
  environment: # Визначення середовища розгортання
    name: production
    url: http://example.com # URL розгорнутого додатку
  only: # Застарілий спосіб керування (краще використовувати rules)
    - main # Виконувати тільки для гілки main
```
:::

## Виконавці (Runners)
Програми або сервіси, що фактично виконують завдання, визначені у `.gitlab-ci.yml`. Можуть бути спільними (Shared), груповими (Group) або специфічними (Specific) для проєктів.

## Конвеєри (Pipelines)
Повна реалізація CI/CD процесу. Складається з етапів та завдань. Запускається автоматично при подіях (push, merge request) або вручну.

# Структура Конвеєра

## Етапи (Stages)
Групують логічно пов'язані завдання. Завдання одного етапу виконуються паралельно (якщо достатньо Runners), а наступний етап починається лише після успішного завершення всіх завдань попереднього.

::: details Визначення Stages
```yaml
# .gitlab-ci.yml
stages:
  - checkout # Отримання коду
  - validate # Перевірка якості, лінтинг
  - build    # Компіляція, збірка артефактів
  - test     # Запуск тестів (unit, integration)
  - deploy   # Розгортання
  - cleanup  # Очищення
```
:::

## Завдання (Jobs)
Найменша одиниця роботи в конвеєрі. Виконує конкретний скрипт (набір команд) у межах визначеного етапу, зазвичай всередині Docker-контейнера.

::: details Приклад Job
```yaml
# .gitlab-ci.yml
unit_tests: # Назва завдання
  stage: test # Етап, до якого належить завдання
  image: node:18 # Docker-образ для виконання завдання
  script: # Команди, які будуть виконані
    - npm install
    - npm run test:unit
  artifacts: # Збереження результатів тестування
    when: always # Зберігати завжди (навіть при помилці)
    reports:
      junit: report.xml # Спеціальний тип артефакту для звітів JUnit
```
:::

## Артефакти (Artifacts)
Файли та директорії, які генеруються завданням та зберігаються після його завершення. Використовуються для передачі результатів між етапами або для завантаження користувачем.

::: details Використання Artifacts
```yaml
# .gitlab-ci.yml
build_app:
  stage: build
  script:
    - ./build-script.sh # Скрипт, що створює бінарний файл у ./dist
  artifacts:
    paths:
      - dist/ # Зберегти вміст директорії dist
    expire_in: 1 week # Як довго зберігати артефакти

deploy_app:
  stage: deploy
  script:
    - echo "Deploying from ./dist"
    - ls dist/ # Доступ до артефактів з попереднього етапу
    # Команди розгортання, що використовують файли з dist/
  needs: # Явно вказує, що це завдання залежить від артефактів build_app
    - build_app
```
:::

## Кешування (Cache)
Механізм для збереження файлів/директорій між запусками одного й того ж завдання (навіть у різних конвеєрах). Прискорює збірки шляхом кешування залежностей (напр., `node_modules`, `.m2`).

::: details Використання Cache
```yaml
# .gitlab-ci.yml
cache: # Глобальне налаштування кешу
  key: ${CI_COMMIT_REF_SLUG} # Ключ кешу (змінюється для кожної гілки)
  paths: # Що кешувати
    - node_modules/
    - .gradle/wrapper/
    - .gradle/caches/

install_deps:
  stage: build
  script:
    - npm install # Буде швидше, якщо node_modules є в кеші
    - ./gradlew dependencies # Буде швидше завдяки кешу .gradle

# Можна перевизначити кеш для конкретного завдання
specific_job:
  stage: test
  cache: # Локальний кеш для цього завдання
    key: specific-files
    paths:
      - specific_dir/
  script:
    - echo "Job with specific cache"
```
:::

# Важливі Можливості

## Змінні (Variables)
Дозволяють передавати конфігурацію та секрети в завдання. Можуть бути визначені глобально, на рівні завдання, у налаштуваннях CI/CD проєкту (з можливістю захисту) або динамічно через `rules`.

::: details Використання Variables
```yaml
# .gitlab-ci.yml
variables: # Глобальні змінні
  GLOBAL_VAR: "This is global"
  DOCKER_IMAGE: "node:18-alpine"

job_with_vars:
  stage: build
  image: $DOCKER_IMAGE # Використання глобальної змінної
  variables: # Змінні рівня завдання
    JOB_VAR: "This is job-specific"
  script:
    - echo "Global Variable: $GLOBAL_VAR"
    - echo "Job Variable: $JOB_VAR"
    - echo "Predefined Variable (branch): $CI_COMMIT_BRANCH"
    # Для секретів, використовуйте змінні з UI GitLab (Settings -> CI/CD -> Variables)
    # - echo "My Secret API Key: $MY_SECRET_API_KEY" (якщо $MY_SECRET_API_KEY визначена в UI)
```
:::

## Правила Виконання (`rules`)
Сучасний та гнучкий спосіб визначення умов, за яких завдання включається (або не включається) до конвеєра. Замінює старіші `only`/`except`.

::: details Використання Rules
```yaml
# .gitlab-ci.yml
deploy_production:
  stage: deploy
  script:
    - echo "Deploying to Production"
  rules:
    - if: '$CI_COMMIT_BRANCH == "main"' # Виконувати тільки для гілки main
      when: on_success # Запускати тільки якщо попередні етапи успішні (за замовчуванням)
    - when: never # В усіх інших випадках - не запускати

run_on_merge_request:
  stage: test
  script:
    - echo "Running tests for Merge Request"
  rules:
    - if: '$CI_PIPELINE_SOURCE == "merge_request_event"' # Виконувати тільки для MR

manual_job:
  stage: cleanup
  script:
    - echo "Running manual cleanup"
  rules:
    - if: '$CI_COMMIT_BRANCH == "main"'
      when: manual # Завдання буде доступне для ручного запуску
      allow_failure: true # Дозволити конвеєру завершитися успішно, навіть якщо це завдання впаде
```
:::

## Середовища (Environments)
Дозволяють логічно групувати розгортання (наприклад, `staging`, `production`). GitLab відстежує історію розгортань для кожного середовища та дозволяє виконувати відкати.

::: details Використання Environments
```yaml
# .gitlab-ci.yml
deploy_staging:
  stage: deploy
  script:
    - echo "Deploying to Staging"
    # deploy commands...
  environment:
    name: staging # Ім'я середовища
    url: https://staging.example.com # URL середовища

deploy_production:
  stage: deploy
  script:
    - echo "Deploying to Production"
    # deploy commands...
  environment:
    name: production
    url: https://example.com
  rules:
    - if: '$CI_COMMIT_BRANCH == "main"'
      when: manual # Ручний запуск для продакшену
```
:::

## Включення Конфігурації (`include`)
Дозволяє розбивати великий `.gitlab-ci.yml` на менші, керовані частини або повторно використовувати конфігурацію з інших файлів, проєктів чи віддалених URL.

::: details Використання Include
```yaml
# .gitlab-ci.yml
include:
  - local: '/templates/.gitlab-ci-build.yml' # Включення локального файлу
  - project: 'my-group/my-pipeline-templates' # Включення з іншого проєкту
    ref: main # Гілка або тег у проєкті шаблонів
    file: '/templates/security-scan.yml'
  - remote: 'https://example.com/ci-templates/template.yml' # Включення з URL

# Решта конфігурації вашого проєкту
stages:
  - build
  - test
  - security # Етап, визначений у security-scan.yml
  - deploy
```
:::

## Шаблони та Наслідування (`extends`)
Механізм для повторного використання блоків конфігурації завдань. Визначається базове "приховане" завдання (з крапкою на початку імені), а інші завдання наслідують його налаштування.

::: details Використання Extends
```yaml
# .gitlab-ci.yml

# Базовий шаблон для завдань збірки (прихований)
.build_template:
  stage: build
  image: node:18
  before_script: # Команди, що виконуються перед основним script
    - npm install --cache .npm --prefer-offline
  cache: # Кеш для всіх завдань, що наслідують цей шаблон
    key: ${CI_COMMIT_REF_SLUG}
    paths:
      - .npm/
      - node_modules/

# Завдання, що наслідує шаблон
build_frontend:
  extends: .build_template # Наслідування
  script:
    - echo "Building frontend..."
    - npm run build:frontend
  artifacts:
    paths:
      - dist/frontend/

# Інше завдання, що наслідує той же шаблон, але перевизначає образ
build_backend:
  extends: .build_template
  image: maven:3.8-openjdk-11 # Перевизначення образу
  script:
    - echo "Building backend..."
    - mvn package
  artifacts:
    paths:
      - target/*.jar
```
:::