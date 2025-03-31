---
title: Kubernetes & Helm
---

# Ресурси Kubernetes та Helm

Огляд ключових об'єктів Kubernetes для керування додатками та концепцій Helm для пакування та розгортання, з прикладами конфігурацій.

## Основні Робочі Навантаження

### Pods
Найменша розгортальна одиниця K8s. Містить один чи більше контейнерів, що ділять мережу та сховище. Зазвичай керуються вищими абстракціями.

::: details Приклад Pod
```yaml
apiVersion: v1
kind: Pod
metadata:
  name: my-app-pod
  labels:
    app: my-app
spec:
  containers:
  - name: my-app-container
    image: nginx:latest # Приклад образу
    ports:
    - containerPort: 80
```
:::

### Deployments
Декларативно керує Pod'ами та їх репліками (ReplicaSets). Забезпечує оновлення без простою, відкати та масштабування для stateless-додатків.

::: details Приклад Deployment
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app-deployment
spec:
  replicas: 3 # Кількість екземплярів Pod
  selector:
    matchLabels:
      app: my-app
  template: # Шаблон для створення Pod'ів
    metadata:
      labels:
        app: my-app
    spec:
      containers:
      - name: my-app-container
        image: nginx:1.21 # Вказано конкретну версію
        ports:
        - containerPort: 80
```
:::

### StatefulSets (Додатки зі Станом)
Керує Pod'ами, що потребують стабільної унікальної мережевої ідентичності та постійного сховища. Ідеально підходить для баз даних або кластеризованих систем.

::: details Приклад StatefulSet
```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: web-db
spec:
  serviceName: "mysql" # Пов'язаний Headless Service
  replicas: 2
  selector:
    matchLabels:
      app: mysql
  template:
    metadata:
      labels:
        app: mysql
    spec:
      containers:
      - name: mysql
        image: mysql:8.0
        ports:
        - containerPort: 3306
          name: mysql
        env:
        - name: MYSQL_ROOT_PASSWORD
          valueFrom:
            secretKeyRef:
              name: mysql-secret
              key: rootPassword
        volumeMounts:
        - name: mysql-persistent-storage
          mountPath: /var/lib/mysql
  volumeClaimTemplates: # Шаблон для створення PVC
  - metadata:
      name: mysql-persistent-storage
    spec:
      accessModes: [ "ReadWriteOnce" ]
      resources:
        requests:
          storage: 1Gi # Запит на 1 ГБ сховища
```
:::

### DaemonSets (Запуск на Вузлах)
Гарантує, що копія Pod'а працює на кожному (або вибраному) вузлі кластера. Використовується для системних агентів, моніторингу чи логування.

::: details Приклад DaemonSet
```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: fluentd-elasticsearch
  namespace: kube-system # Часто системні компоненти розміщують тут
  labels:
    k8s-app: fluentd-logging
spec:
  selector:
    matchLabels:
      name: fluentd-elasticsearch
  template:
    metadata:
      labels:
        name: fluentd-elasticsearch
    spec:
      tolerations: # Дозволяє запуск на control-plane вузлах
      - key: node-role.kubernetes.io/control-plane
        operator: Exists
        effect: NoSchedule
      containers:
      - name: fluentd-elasticsearch
        image: quay.io/fluentd_elasticsearch/fluentd:v2.5.2
        resources:
          limits:
            memory: 200Mi
          requests:
            cpu: 100m
            memory: 200Mi
        volumeMounts:
        - name: varlog
          mountPath: /var/log
        - name: varlibdockercontainers
          mountPath: /var/lib/docker/containers
          readOnly: true
      terminationGracePeriodSeconds: 30
      volumes:
      - name: varlog
        hostPath:
          path: /var/log
      - name: varlibdockercontainers
        hostPath:
          path: /var/lib/docker/containers
```
:::

## Конфігурація та Сховище

### ConfigMaps (Зовнішня Конфігурація)
Зберігає неконфіденційні конфігураційні дані як пари ключ-значення. Дозволяє відокремити конфігурацію від образу контейнера для гнучкості.

::: details Приклад ConfigMap
```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config
data:
  # Конфігурація як прості ключ-значення
  DATABASE_URL: "db.example.com"
  API_KEY: "default-key"

  # Конфігурація як файл
  config.properties: |
    feature.enabled=true
    log.level=INFO
```
:::

### Secrets
Зберігає секретну інформацію: паролі, API-ключі, токени. Дані кодуються (base64) або шифруються для безпечного використання Pod'ами.

::: details Приклад Secret
```yaml
apiVersion: v1
kind: Secret
metadata:
  name: db-credentials
type: Opaque # Стандартний тип
data:
  # Значення мають бути закодовані в base64
  # echo -n 'myuser' | base64 -> bXl1c2Vy
  username: bXl1c2Vy
  # echo -n 'mypassword123' | base64 -> bXlwYXNzd29yZDEyMw==
  password: bXlwYXNzd29yZDEyMw==
```
:::

### PersistentVolumes - PV
Абстракція над фізичним сховищем (диск, NFS), підготовлена адміністратором. Має власний життєвий цикл, незалежний від Pod'ів.

::: details Приклад PersistentVolume
```yaml
apiVersion: v1
kind: PersistentVolume
metadata:
  name: task-pv-volume
  labels:
    type: local # Може бути NFS, AWS EBS, GCE PD тощо
spec:
  storageClassName: manual # Клас сховища
  capacity:
    storage: 10Gi # Розмір тому
  accessModes:
    - ReadWriteOnce # Доступ (RWO, ROX, RWX)
  hostPath: # Приклад локального сховища (не для продакшену!)
    path: "/mnt/data"
```
:::

### PersistentVolumeClaims - PVC
Запит користувача (Pod'а) на ресурс PV. Дозволяє додатку вимагати сховище певного розміру та типу доступу, не знаючи деталей.

::: details Приклад PersistentVolumeClaim
```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: task-pv-claim
spec:
  storageClassName: manual # Має відповідати PV або бути порожнім для динамічного provisioning
  accessModes:
    - ReadWriteOnce # Режим доступу має збігатися з PV
  resources:
    requests:
      storage: 3Gi # Запит на 3 ГБ (має бути <= ємності PV)
```
:::

## Мережа та Доступ

### Services
Надає стабільний IP та DNS для групи логічно пов'язаних Pod'ів. Забезпечує виявлення сервісів та балансування навантаження між ними.

::: details Приклад Service (ClusterIP)
```yaml
apiVersion: v1
kind: Service
metadata:
  name: my-internal-service
spec:
  type: ClusterIP # Тип за замовчуванням, доступний тільки всередині кластера
  selector:
    app: my-app # Вибирає Pod'и з цим лейблом
  ports:
  - protocol: TCP
    port: 80 # Порт, на якому сервіс буде доступний
    targetPort: 8080 # Порт контейнера, куди перенаправляти трафік
```
:::

### Service Types
Визначають спосіб доступу до Service: `ClusterIP` (внутрішній), `NodePort` (зовнішній порт вузла), `LoadBalancer` (хмарний балансувальник), `ExternalName` (псевдонім DNS).

::: details Приклад Service (NodePort)
```yaml
apiVersion: v1
kind: Service
metadata:
  name: my-nodeport-service
spec:
  type: NodePort # Доступний зовні через порт на кожному вузлі
  selector:
    app: my-app
  ports:
  - protocol: TCP
    port: 80 # Внутрішній порт сервісу
    targetPort: 80 # Порт контейнера
    # nodePort: 30080 # Можна вказати статичний порт (опціонально, з діапазону 30000-32767)
```
:::

::: details Приклад Service (LoadBalancer)
```yaml
apiVersion: v1
kind: Service
metadata:
  name: my-loadbalancer-service
spec:
  type: LoadBalancer # Створює хмарний балансувальник (якщо підтримується провайдером)
  selector:
    app: my-app
  ports:
  - protocol: TCP
    port: 80 # Порт на балансувальнику
    targetPort: 80 # Порт контейнера
```
:::

### Ingress
Керує зовнішнім HTTP/S трафіком до сервісів кластера. Дозволяє налаштовувати маршрутизацію за URL, віртуальні хости та SSL/TLS термінацію.

::: details Приклад Ingress
```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: minimal-ingress
  annotations:
    nginx.ingress.kubernetes.io/rewrite-target: / # Приклад анотації для Nginx Ingress Controller
spec:
  ingressClassName: nginx-example # Важливо вказати клас, якщо їх декілька
  rules:
  - host: "app.example.com" # Доменне ім'я
    http:
      paths:
      - path: / # Шлях URL
        pathType: Prefix # Тип шляху (Prefix або Exact)
        backend:
          service:
            name: my-internal-service # Сервіс, куди спрямовувати трафік
            port:
              number: 80 # Порт сервісу
```
:::

## Структура Кластера

### Nodes (Робочі Машини)
Фізичні або віртуальні машини, що складають кластер. На них Kubelet запускає та керує Pod'ами з контейнерами. (Немає прямого YAML-визначення для створення, керується інфраструктурою).

### Namespaces (Віртуальні Кластери)
Логічний поділ ресурсів кластера. Дозволяє ізолювати середовища (dev, prod), команди або проекти в межах одного фізичного кластера.

::: details Приклад Namespace
```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: development # Ім'я простору імен
```
:::

Ви маєте рацію. Шаблонізація – це ключова перевага Helm. Я додав розділ із прикладом шаблонізації.

Ось оновлена версія розділу про Helm:

## Helm: Менеджер Пакунків

### Пакунки Helm (Charts)
Набір файлів, що описують пов'язані ресурси K8s як єдиний додаток. Шаблони (`templates`) дозволяють налаштування через `values.yaml`.

::: details Приклад структури Helm Chart
```
my-chart/
├── Chart.yaml        # Інформація про чарт
├── values.yaml       # Значення за замовчуванням для шаблонів
├── charts/           # Залежності (під-чарти)
├── templates/        # Директорія з шаблонами ресурсів K8s
│   ├── deployment.yaml
│   ├── service.yaml
│   └── _helpers.tpl  # Опціональні помічники/шаблони
└── NOTES.txt         # Опціональні нотатки після встановлення
```
:::

::: details Приклад шаблонізації в Helm
Припустимо, у нас є такий `values.yaml`:
```yaml
# values.yaml
replicaCount: 3
image:
  repository: nginx
  tag: stable
  pullPolicy: IfNotPresent
service:
  type: ClusterIP
  port: 80
ingress:
  enabled: true
  host: chart-example.local
```

Тоді шаблон `templates/deployment.yaml` може виглядати так:
```yaml
# templates/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: {{ .Release.Name }}-deployment # Використання імені релізу
spec:
  replicas: {{ .Values.replicaCount }} # Значення з values.yaml
  selector:
    matchLabels:
      app: {{ .Release.Name }}
  template:
    metadata:
      labels:
        app: {{ .Release.Name }}
    spec:
      containers:
        - name: {{ .Chart.Name }} # Використання імені чарту
          image: "{{ .Values.image.repository }}:{{ .Values.image.tag }}" # Конкатенація значень
          imagePullPolicy: {{ .Values.image.pullPolicy }}
          ports:
            - containerPort: 80 # Статичне значення або також можна взяти з values
```

А шаблон `templates/service.yaml` може використовувати умову:
```yaml
# templates/service.yaml
apiVersion: v1
kind: Service
metadata:
  name: {{ .Release.Name }}-service
spec:
  type: {{ .Values.service.type }} # Тип сервісу з values.yaml
  ports:
    - port: {{ .Values.service.port }}
      targetPort: 80 # Припустимо, контейнер завжди слухає на 80
      protocol: TCP
      name: http
  selector:
    app: {{ .Release.Name }}
```

І шаблон для Ingress, який створюється тільки якщо `ingress.enabled` встановлено в `true`:
```yaml
# templates/ingress.yaml
{{- if .Values.ingress.enabled -}} # Умова "if"
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: {{ .Release.Name }}-ingress
spec:
  rules:
  - host: {{ .Values.ingress.host }} # Хост з values.yaml
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: {{ .Release.Name }}-service # Посилання на створений сервіс
            port:
              number: {{ .Values.service.port }}
{{- end }} # Кінець умови "if"
```
У цьому прикладі:
*   `{{ .Values.someValue }}` звертається до значень у `values.yaml`.
*   `{{ .Release.Name }}` використовує ім'я, надане під час встановлення (`helm install my-release .`).
*   `{{ .Chart.Name }}` використовує ім'я чарту з `Chart.yaml`.
*   Конструкція `{{- if ... }} ... {{- end }}` дозволяє умовно включати частини шаблону.
*   `{{- ... -}}` видаляє зайві пробіли навколо тегу.
:::

### Releases (Розгорнуті Додатки)
Конкретний екземпляр Chart, розгорнутий у K8s кластері за допомогою Helm. Керується командами Helm (`helm install`, `helm upgrade`, `helm list`). Кожен реліз має унікальне ім'я, версію та конфігурацію.

### Repositories
Централізовані місця для зберігання та спільного використання упакованих Helm Charts. Керуються командами Helm (`helm repo add`, `helm repo update`). Дозволяють легко знаходити та встановлювати готові додатки.