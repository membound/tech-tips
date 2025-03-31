# Jenkins
Автоматизація повторюваних завдань. Побудова конвеєрів CI/CD. Інтеграція з різними інструментами та технологіями через плагіни. Розподіл навантаження збірок.

# Архітектура та Компоненти

## Керуючий Вузол (Master)
Центральний сервер Jenkins. Планує завдання, розподіляє роботу між агентами, зберігає конфігурації та надає веб-інтерфейс користувача для керування.

## Робочі Вузли (Agents/Nodes)
Машини (фізичні/віртуальні/контейнери), що виконують реальну роботу: збірку, тестування, розгортання. Зменшують навантаження на Master та дозволяють паралельне виконання.

## Розширення (Plugins)
Основна сила Jenkins. Тисячі плагінів додають підтримку різних систем контролю версій, інструментів збірки, фреймворків тестування, хмарних платформ та сповіщень.

# Конвеєри (Pipelines)

## Що таке Pipeline?
Набір інструкцій, що визначають весь процес CI/CD (збірка, тестування, розгортання) як код. Зазвичай зберігається у файлі `Jenkinsfile`.

## Файл Jenkinsfile
Текстовий файл, що зберігається в системі контролю версій разом із кодом проєкту. Описує етапи (stages) та кроки (steps) конвеєра.

::: details Приклад Declarative Pipeline (Jenkinsfile)
```groovy
pipeline {
    agent any // Виконувати на будь-якому доступному агенті

    stages {
        stage('Build') { // Етап Збірки
            steps {
                echo 'Building..'
                sh './gradlew build' // Виконання shell-команди
            }
        }
        stage('Test') { // Етап Тестування
            steps {
                echo 'Testing..'
                sh './gradlew test'
            }
        }
        stage('Deploy') { // Етап Розгортання
            when { // Умова для виконання етапу
                branch 'main' // Тільки для гілки main
            }
            steps {
                echo 'Deploying....'
                // Кроки для розгортання
            }
        }
    }

    post { // Дії після завершення Pipeline
        always {
            echo 'Pipeline finished.'
            // Наприклад, очищення робочого простору
            cleanWs()
        }
        success {
            echo 'Pipeline succeeded!'
            // Наприклад, відправити сповіщення про успіх
        }
        failure {
            echo 'Pipeline failed!'
            // Наприклад, відправити сповіщення про помилку
        }
    }
}
```
:::

## Типи Pipeline
*   **Declarative Pipeline:** Новіший, структурований синтаксис. Простіший для читання та написання, має чітку модель визначення етапів.
*   **Scripted Pipeline:** Оригінальний, гнучкіший синтаксис на основі Groovy. Дозволяє складнішу логіку, але може бути важчим для розуміння.

::: details Приклад Scripted Pipeline (Jenkinsfile)
```groovy
node { // Визначення вузла для виконання
    try {
        stage('Checkout') {
            echo 'Checking out code...'
            git 'https://github.com/your-repo/project.git'
        }

        stage('Build') {
            echo 'Building...'
            sh './mvnw clean package'
        }

        stage('Test') {
            echo 'Running tests...'
            // Умовна логіка
            if (fileExists('integration-tests')) {
                sh './run-integration-tests.sh'
            } else {
                sh './mvnw test'
            }
        }

        stage('Deploy') {
            if (env.BRANCH_NAME == 'main') { // Використання змінних середовища
                echo 'Deploying application...'
                // Кроки розгортання
            } else {
                echo "Skipping deployment for branch ${env.BRANCH_NAME}"
            }
        }
    } catch (e) {
        // Обробка помилок
        currentBuild.result = 'FAILURE'
        echo "Pipeline failed: ${e.getMessage()}"
        // Наприклад, відправити сповіщення
        throw e // Перевикинути помилку, щоб Jenkins позначив збірку як невдалу
    } finally {
        // Завжди виконується
        echo 'Cleaning up workspace...'
        cleanWs()
    }
}
```
:::

# Важливі Аспекти

## Безпека та Облікові Дані (Credentials)
Jenkins дозволяє безпечно зберігати та керувати чутливими даними (паролі, API-ключі, SSH-ключі) через Credentials Plugin та використовувати їх у Pipeline.

::: details Використання Credentials у Pipeline
```groovy
pipeline {
    agent any
    environment {
        // Прив'язка секретного тексту до змінної середовища
        MY_API_KEY = credentials('my-api-key-credential-id')
        // Прив'язка імені користувача та пароля
        DB_CREDS = credentials('my-db-credential-id')
    }
    stages {
        stage('Deploy') {
            steps {
                sh 'echo Using API Key: $MY_API_KEY' // Змінна доступна
                sh 'deploy-script --user $DB_CREDS_USR --password $DB_CREDS_PSW' // Спеціальні змінні для user/pass
                
                // Використання SSH ключа
                withCredentials([sshUserPrivateKey(credentialsId: 'my-ssh-key-id', keyFileVariable: 'SSH_KEY_FILE')]) {
                    sh 'ssh -i $SSH_KEY_FILE user@server command'
                }
            }
        }
    }
}
```
:::

## Завдання (Jobs)
Окрім Pipeline, Jenkins підтримує інші типи завдань, такі як "Freestyle project" (конфігурація через UI), "Multibranch Pipeline" (автоматично для гілок репозиторію).

## Конфігурація як Код (JCasC)
Плагін Jenkins Configuration as Code (JCasC) дозволяє керувати конфігурацією самого Jenkins (настройки безпеки, агенти, плагіни) за допомогою YAML-файлів, що зберігаються у Git.

::: details Приклад JCasC (YAML)
```yaml
jenkins:
  systemMessage: "Jenkins configured by Configuration as Code plugin"
  numExecutors: 5 # Кількість виконавців на master
  scmCheckoutRetryCount: 2
  mode: NORMAL
security:
  globalJobDslSecurityConfiguration:
    useScriptSecurity: true
tool:
  git:
    installations:
    - name: "Default Git"
      home: "/usr/bin/git" # Шлях до git на машині
  jdk:
    installations:
    - name: "JDK11"
      home: "/opt/java/openjdk-11" # Шлях до JDK
unclassified:
  location:
    url: "http://your-jenkins-url.com/" # URL Jenkins
```
:::

## Розподілені Збірки
Використання агентів дозволяє виконувати завдання паралельно на різних машинах, що значно прискорює процес CI/CD для великих проєктів.
