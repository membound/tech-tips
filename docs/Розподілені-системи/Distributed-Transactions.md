# Розподілені Транзакції

Традиційні ACID-транзакції, які покладаються на двофазну фіксацію (2PC) через мережу, зазвичай не підходять через проблеми з продуктивністю, масштабованістю та блокуванням ресурсів.
Натомість у розподілених системах частіше застосовують підходи, що забезпечують *кінцеву узгодженість* (Eventual Consistency), використовуючи модель BASE (Basically Available, Soft state, Eventually consistent).

## 1. Патерн Saga

Saga — це послідовність локальних транзакцій. Кожна локальна транзакція оновлює дані у своєму сервісі та публікує подію або надсилає команду для запуску наступної локальної транзакції в іншому сервісі. Якщо крок зазнає невдачі, Saga виконує *компенсуючі транзакції*, щоб скасувати попередні зміни та відновити узгодженість даних.

Існують два основних способи реалізації Saga:

### a) Хореографія (Choreography)

Сервіси взаємодіють напряму, публікуючи події та реагуючи на них. Немає центрального координатора.

*   **Переваги:**
    *   Слабке зв'язування (Loose coupling) між сервісами.
    *   Простота окремих сервісів.
    *   Децентралізація, відсутність єдиної точки відмови (SPOF) координатора.
*   **Недоліки:**
    *   Складно відстежувати стан процесу (де ми зараз у Saga?).
    *   Ризик циклічних залежностей між сервісами.
    *   Ускладнене налагодження та тестування наскрізних потоків.
    *   Потреба в надійній доставці подій (часто використовується **Патерн Outbox**, див. нижче).

**Приклад (Хореографія):**

```java
// OrderService: Створює замовлення та публікує подію OrderCreatedEvent
@Service
@RequiredArgsConstructor
public class OrderService {

    private final OrderRepository orderRepository;
    // ВАЖЛИВО: Пряма публікація тут може бути ненадійною!
    // Краще використовувати Outbox Pattern (див. окремий розділ).
    private final ApplicationEventPublisher eventPublisher;

    @Transactional
    public Order createOrder(OrderData orderData) {
        Order order = new Order(orderData.getCustomerId(), OrderStatus.PENDING);
        order = orderRepository.save(order);

        // Подія про створення замовлення
        OrderCreatedEvent event = new OrderCreatedEvent(order.getId(), order.getCustomerId(), orderData.getTotalAmount());
        eventPublisher.publishEvent(event); // Публікуємо подію

        return order;
    }
     // --- Решта коду сервісу ---
}

// PaymentService: Слухає подію OrderCreatedEvent
@Service
@RequiredArgsConstructor
public class PaymentService {

    private final PaymentRepository paymentRepository;
    private final ApplicationEventPublisher eventPublisher;

    @Transactional
    @EventListener // Або через Kafka/RabbitMQ Listener
    public void handleOrderCreated(OrderCreatedEvent event) {
        System.out.println("Обробка платежу для замовлення: " + event.getOrderId());
        // Логіка перевірки балансу та списання коштів...
        boolean paymentSuccessful = processPayment(event.getCustomerId(), event.getAmount());

        if (paymentSuccessful) {
            Payment payment = new Payment(event.getOrderId(), PaymentStatus.COMPLETED);
            paymentRepository.save(payment);
            // Публікуємо подію про успішний платіж
            eventPublisher.publishEvent(new PaymentProcessedEvent(event.getOrderId(), true));
        } else {
            // Публікуємо подію про невдачу платежу
            eventPublisher.publishEvent(new PaymentProcessedEvent(event.getOrderId(), false));
            // Потрібна компенсуюча транзакція для замовлення (наприклад, зміна статусу на FAILED)
        }
    }
     // --- Решта коду сервісу ---
}
```

### b) Оркестрація (Orchestration)

Центральний сервіс (оркестратор) керує потоком Saga, надсилаючи команди іншим сервісам та отримуючи від них відповіді/події.

*   **Переваги:**
    *   Централізована логіка управління процесом.
    *   Легше відстежувати стан Saga.
    *   Простіше налагодження та моніторинг.
    *   Чітко визначений потік виконання.
*   **Недоліки:**
    *   Оркестратор стає потенційним вузьким місцем та SPOF.
    *   Сервіси стають більш зв'язаними з оркестратором.
    *   Може призвести до "розумного" оркестратора та "анемічних" сервісів.

**Приклад (Оркестрація):**

```java
// OrderSagaOrchestrator: Керує процесом створення замовлення
@Service
@RequiredArgsConstructor
public class OrderSagaOrchestrator {

    private final OrderServiceClient orderClient; // Feign/Rest Client
    private final PaymentServiceClient paymentClient; // Feign/Rest Client
    private final InventoryServiceClient inventoryClient; // Feign/Rest Client

    // Початковий метод запуску Saga
    public void createOrderSaga(CreateOrderRequest request) {
        Long orderId = null;
        boolean paymentSuccess = false;
        boolean inventorySuccess = false;

        try {
            // Крок 1: Створити замовлення (статус PENDING)
            orderId = orderClient.createOrder(request.getOrderData());
            System.out.println("Saga: Замовлення створено: " + orderId);

            // Крок 2: Спробувати списати кошти
            paymentSuccess = paymentClient.processPayment(orderId, request.getPaymentData());
            System.out.println("Saga: Платіж успішний: " + paymentSuccess);
            if (!paymentSuccess) {
                throw new SagaException("Помилка оплати");
            }

            // Крок 3: Спробувати зарезервувати товар
            inventorySuccess = inventoryClient.reserveInventory(orderId, request.getInventoryData());
            System.out.println("Saga: Резервування успішне: " + inventorySuccess);
            if (!inventorySuccess) {
                throw new SagaException("Помилка резервування товару");
            }

            // Успішне завершення: Оновити статус замовлення на COMPLETED
            orderClient.completeOrder(orderId);
            System.out.println("Saga: Завершено успішно для замовлення " + orderId);

        } catch (Exception e) {
            System.err.println("Saga: Помилка - запускаємо компенсацію для замовлення " + orderId + ": " + e.getMessage());
            // Компенсація (у зворотньому порядку)
            if (inventorySuccess) {
                inventoryClient.compensateInventoryReservation(orderId); // Відмінити резерв
                System.err.println("Saga: Компенсація резервування виконана");
            }
            if (paymentSuccess) {
                paymentClient.compensatePayment(orderId); // Повернути кошти
                System.err.println("Saga: Компенсація платежу виконана");
            }
            if (orderId != null) {
                orderClient.failOrder(orderId); // Позначити замовлення як невдале
                System.err.println("Saga: Замовлення позначено як невдале");
            }
        }
    }
    // --- Потрібні клієнти, їх реалізації та ендпоінти в сервісах ---
    // --- Потрібен клас SagaException ---
}
```

## 2. Патерн Outbox (Транзакційний Вихідний Буфер)

Цей патерн вирішує проблему **атомарного оновлення стану бази даних та публікації події/повідомлення**. Без цього патерну можлива ситуація, коли зміна в базі даних успішно збережена, але відправка повідомлення в брокер зазнала невдачі (або навпаки), що призводить до неузгодженості системи.

**Як це працює:**

1.  **Атомарне збереження:** Замість прямої публікації події, сервіс зберігає її у спеціальній таблиці (`outbox`) в тій самій базі даних і **в межах тієї ж локальної транзакції**, де оновлюються бізнес-дані.
2.  **Окремий процес-публікатор:** Незалежний процес (або потік, заплановане завдання) періодично сканує таблицю `outbox` на наявність нових, ще не опублікованих подій.
3.  **Надійна публікація:** Цей процес намагається опублікувати подію у брокер повідомлень (наприклад, Kafka, RabbitMQ).
4.  **Обробка результату:**
    *   Якщо публікація успішна, запис про подію в таблиці `outbox` позначається як опублікований або видаляється.
    *   Якщо публікація невдала, процес повторить спробу пізніше (реалізація механізму повторів).

*   **Переваги:**
    *   **Гарантована атомарність** між збереженням стану та підготовкою події до відправки.
    *   **Підвищена надійність** доставки подій, оскільки публікатор може повторювати спроби.
    *   Добре працює з хореографічною Saga.
*   **Недоліки:**
    *   **Додаткова складність:** Потрібна таблиця `outbox` та логіка процесу-публікатора.
    *   **Можлива затримка** у доставці подій (залежить від частоти сканування `outbox`).
    *   Потенційне навантаження на базу даних через запити до таблиці `outbox`.

**Приклад (Використання Outbox в OrderService):**

```java
// Сутність для таблиці Outbox
@Entity
@Table(name = "outbox")
@Getter @Setter @NoArgsConstructor
public class OutboxEvent {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String aggregateType; // Наприклад, "Order"

    @Column(nullable = false)
    private String aggregateId; // ID замовлення

    @Column(nullable = false)
    private String eventType; // Наприклад, "OrderCreatedEvent"

    @Column(nullable = false, columnDefinition = "TEXT") // Або JSONB для PostgreSQL
    private String payload; // JSON представлення події

    @Column(nullable = false)
    private LocalDateTime timestamp = LocalDateTime.now();

    @Column(nullable = false)
    private boolean published = false; // Прапорець статусу публікації

    public OutboxEvent(String aggregateType, String aggregateId, String eventType, String payload) {
        this.aggregateType = aggregateType;
        this.aggregateId = aggregateId;
        this.eventType = eventType;
        this.payload = payload;
    }
}

// Репозиторій для Outbox
public interface OutboxEventRepository extends JpaRepository<OutboxEvent, Long> {
    List<OutboxEvent> findByPublishedFalseOrderByTimestampAsc(Pageable pageable);
}

// OrderService з використанням Outbox
@Service
@RequiredArgsConstructor
public class OrderService {

    private final OrderRepository orderRepository;
    private final OutboxEventRepository outboxEventRepository; // Інжектуємо репозиторій
    private final ObjectMapper objectMapper; // Для серіалізації

    @Transactional // <-- Важливо! Обидва збереження в одній транзакції
    public Order createOrder(OrderData orderData) {
        // 1. Зберігаємо бізнес-сутність
        Order order = new Order(orderData.getCustomerId(), OrderStatus.PENDING);
        order = orderRepository.save(order);

        // 2. Створюємо та зберігаємо подію в Outbox
        OrderCreatedEvent eventPayload = new OrderCreatedEvent(order.getId(), order.getCustomerId(), orderData.getTotalAmount());
        String payloadJson;
        try {
            payloadJson = objectMapper.writeValueAsString(eventPayload);
        } catch (JsonProcessingException e) {
            throw new RuntimeException("Помилка серіалізації події для Outbox", e);
        }

        OutboxEvent outboxEvent = new OutboxEvent(
            "Order",
            order.getId().toString(),
            OrderCreatedEvent.class.getSimpleName(),
            payloadJson
        );
        outboxEventRepository.save(outboxEvent); // <-- Зберігаємо в тій самій транзакції

        // Публікація події тут НЕ відбувається!

        return order;
    }
    // --- Решта коду сервісу ---
}

// Окремий компонент - Публікатор подій з Outbox
@Component
@RequiredArgsConstructor
public class OutboxEventPublisher {

    private final OutboxEventRepository outboxEventRepository;
    private final KafkaTemplate<String, String> kafkaTemplate; // Або RabbitMQ тощо
    private final String orderTopic = "order-events"; // Назва топіка

    @Scheduled(fixedDelay = 1000) // Запускати кожну секунду (приклад)
    @Transactional // Окрему транзакцію для читання та оновлення статусу
    public void processOutboxEvents() {
        Pageable limit = PageRequest.of(0, 100); // Обробляти пачками
        List<OutboxEvent> events = outboxEventRepository.findByPublishedFalseOrderByTimestampAsc(limit);

        for (OutboxEvent event : events) {
            try {
                System.out.println("Публікація події з Outbox: " + event.getId() + ", тип: " + event.getEventType());
                // Відправляємо подію в брокер
                kafkaTemplate.send(orderTopic, event.getAggregateId(), event.getPayload()); // Ключ = ID агрегату
                // Позначаємо подію як опубліковану
                event.setPublished(true);
                outboxEventRepository.save(event); // Оновлюємо статус
                 System.out.println("Подія " + event.getId() + " опублікована успішно.");
            } catch (Exception e) {
                // Логування помилки, механізм повторів може бути складнішим
                System.err.println("Помилка публікації події " + event.getId() + ": " + e.getMessage());
                // Не оновлюємо статус, спроба буде повторена наступного разу
            }
        }
    }
}
```

## 3. Try-Confirm/Cancel (TCC)

Це варіант Saga, де кожен крок складається з трьох операцій:

1.  **Try:** Попередня спроба виконати дію (наприклад, зарезервувати ресурси, перевірити умови). Не робить фінальних змін.
2.  **Confirm:** Якщо всі `Try` операції успішні, викликаються `Confirm` для фіксації змін.
3.  **Cancel:** Якщо хоча б одна `Try` операція зазнала невдачі (або `Confirm` не вдалося), викликаються `Cancel` для всіх попередніх кроків, щоб скасувати резервування чи інші тимчасові зміни.

*   **Переваги:**
    *   Більш суворі гарантії під час фази `Try` (ресурси зарезервовані).
    *   Може бути простішим для реалізації певних бізнес-сценаріїв порівняно з компенсацією через події.
*   **Недоліки:**
    *   Висока складність реалізації: потрібно написати логіку `Try`, `Confirm`, `Cancel` для кожної дії.
    *   Ресурси можуть бути заблоковані (зарезервовані) на довший час.
    *   Потенційні проблеми, якщо `Confirm` або `Cancel` зазнають невдачі (потрібна додаткова логіка відновлення).

**Приклад (TCC для резервування товару):**

```java
// Інтерфейс для TCC операції
interface TccActivity<T> {
    boolean tryAction(T context); // Повертає true/false або кидає виняток
    void confirmAction(T context);
    void cancelAction(T context);
}

// Контекст для операції резервування
@Data
class InventoryReservationContext {
    private Long orderId;
    private String productId;
    private int quantity;
    private Long reservationId; // Ідентифікатор резервування, створений у Try
}

// InventoryService реалізує TCC для резервування
@Service
@RequiredArgsConstructor
public class InventoryTccService implements TccActivity<InventoryReservationContext> {

    private final InventoryRepository inventoryRepository;
    private final ReservationRepository reservationRepository;

    @Override
    @Transactional // Локальна транзакція для Try
    public boolean tryAction(InventoryReservationContext context) {
        System.out.println("TCC Try: Резервування " + context.getQuantity() + " шт. продукту " + context.getProductId());
        // 1. Перевірити наявність
        InventoryItem item = inventoryRepository.findByProductId(context.getProductId())
            .orElseThrow(() -> new RuntimeException("Продукт не знайдено"));

        if (item.getAvailableQuantity() < context.getQuantity()) {
            System.err.println("TCC Try: Недостатньо товару на складі");
            return false; // Невдача Try
        }

        // 2. Зменшити *доступну* кількість та створити запис про резервування
        item.setAvailableQuantity(item.getAvailableQuantity() - context.getQuantity());
        inventoryRepository.save(item);

        Reservation reservation = new Reservation(context.getOrderId(), context.getProductId(), context.getQuantity(), ReservationStatus.PENDING);
        reservation = reservationRepository.save(reservation);
        context.setReservationId(reservation.getId());

        System.out.println("TCC Try: Резервування створено: " + reservation.getId());
        return true; // Успішний Try
    }

    @Override
    @Transactional // Локальна транзакція для Confirm
    public void confirmAction(InventoryReservationContext context) {
        System.out.println("TCC Confirm: Підтвердження резервування " + context.getReservationId());
        Reservation reservation = reservationRepository.findById(context.getReservationId())
            .orElseThrow(() -> new RuntimeException("Резервування не знайдено для Confirm"));

        if (reservation.getStatus() != ReservationStatus.PENDING) {
             System.err.println("TCC Confirm: Невірний статус резервування: " + reservation.getStatus());
            return; // Ідемпотентність
        }

        // 1. Оновити статус резервування на CONFIRMED
        reservation.setStatus(ReservationStatus.CONFIRMED);
        reservationRepository.save(reservation);

        // 2. Зменшити *фактичну* кількість товару
        InventoryItem item = inventoryRepository.findByProductId(context.getProductId())
                .orElseThrow(() -> new RuntimeException("Продукт не знайдено для Confirm"));
        item.setActualQuantity(item.getActualQuantity() - context.getQuantity());
        inventoryRepository.save(item);
         System.out.println("TCC Confirm: Резервування підтверджено, кількість оновлено.");
    }

    @Override
    @Transactional // Локальна транзакція для Cancel
    public void cancelAction(InventoryReservationContext context) {
        System.out.println("TCC Cancel: Скасування резервування " + context.getReservationId());
         Reservation reservation = reservationRepository.findById(context.getReservationId())
                .orElse(null);

        if (reservation == null || reservation.getStatus() == ReservationStatus.CANCELLED) {
            System.err.println("TCC Cancel: Резервування не знайдено або вже скасовано.");
            return; // Ідемпотентність
        }

        if (reservation.getStatus() != ReservationStatus.PENDING) {
             System.err.println("TCC Cancel: Неможливо скасувати вже підтверджене резервування: " + reservation.getStatus());
            return;
        }

        // 1. Оновити статус резервування на CANCELLED
        reservation.setStatus(ReservationStatus.CANCELLED);
        reservationRepository.save(reservation);

        // 2. Повернути *доступну* кількість товару
         InventoryItem item = inventoryRepository.findByProductId(context.getProductId())
                .orElseThrow(() -> new RuntimeException("Продукт не знайдено для Cancel"));
        item.setAvailableQuantity(item.getAvailableQuantity() + context.getQuantity());
        inventoryRepository.save(item);
        System.out.println("TCC Cancel: Резервування скасовано, доступна кількість відновлена.");
    }
     // --- Потрібні репозиторії та сутності ---
}
```

## 4. Двофазна Фіксація (Two-Phase Commit - 2PC)

Класичний протокол для забезпечення атомарності розподілених транзакцій (ACID). Вимагає координатора транзакцій та підтримки протоколу (наприклад, XA) всіма учасниками (базами даних, брокерами повідомлень).

1.  **Фаза 1 (Prepare):** Координатор запитує всіх учасників, чи готові вони зафіксувати свою частину транзакції. Учасники виконують роботу, блокують ресурси і відповідають "так" або "ні".
2.  **Фаза 2 (Commit/Abort):** Якщо *всі* учасники відповіли "так", координатор надсилає команду `Commit`. Інакше він надсилає команду `Abort` (Rollback).

*   **Переваги:**
    *   Забезпечує повну атомарність (усі або ніхто).
*   **Недоліки:**
    *   **Блокуючий протокол:** Ресурси блокуються від фази Prepare до завершення фази Commit/Abort, що суттєво знижує пропускну здатність.
    *   **Низька продуктивність та масштабованість:** Особливо в мережах з високою затримкою (типово для MSA).
    *   **Координатор є SPOF:** Якщо координатор виходить з ладу під час фази 2, учасники залишаються у невизначеному стані (заблоковані ресурси).
    *   **Обмежена підтримка:** Не всі технології (особливо NoSQL бази даних) підтримують XA протокол.
    *   **Вважається антипатерном** у більшості сучасних MSA через перелічені недоліки.

**Приклад (Концептуальний - Використання JTA з Atomikos/Narayana):**

*Примітка: Повна конфігурація JTA виходить за рамки короткого прикладу. Це лише ілюстрація використання `@Transactional`.*

```java
// Потрібна конфігурація JTA Transaction Manager (напр. Atomikos) у Spring Boot
// Потрібні XADataSource для кожної бази даних

@Service
@RequiredArgsConstructor
public class TransferService {

    // Репозиторії для різних баз даних (налаштованих з XADataSource)
    private final AccountRepository db1AccountRepository;
    private final LedgerRepository db2LedgerRepository;

    // Ця анотація використовує налаштований JTA Transaction Manager
    @Transactional // <-- Розподілена транзакція через JTA/XA
    public void transferFunds(Long fromAccountId, Long toAccountId, BigDecimal amount) {

        // Операція в першій базі даних
        Account fromAccount = db1AccountRepository.findById(fromAccountId)
                .orElseThrow(() -> new RuntimeException("Рахунок відправника не знайдено"));
        if (fromAccount.getBalance().compareTo(amount) < 0) {
            throw new RuntimeException("Недостатньо коштів");
        }
        fromAccount.setBalance(fromAccount.getBalance().subtract(amount));
        db1AccountRepository.save(fromAccount);

        // Операція в другій базі даних (імітація іншого сервісу/БД)
        // На практиці це був би виклик іншого сервісу, який також бере участь у XA-транзакції
        Account toAccount = db1AccountRepository.findById(toAccountId) // Припустимо, той самий репозиторій для спрощення
                .orElseThrow(() -> new RuntimeException("Рахунок отримувача не знайдено"));
        toAccount.setBalance(toAccount.getBalance().add(amount));
        db1AccountRepository.save(toAccount);

         // Запис у реєстр (інша база даних/сервіс)
         LedgerEntry entry = new LedgerEntry(fromAccountId, toAccountId, amount, LocalDateTime.now());
         db2LedgerRepository.save(entry); // Цей репозиторій також має бути під XA

        // Якщо будь-яка операція зазнає невдачі, JTA менеджер відкотить транзакції в УСІХ учасниках
        // Якщо все успішно, JTA менеджер виконає Commit для УСІХ учасників (через 2PC)
    }
     // --- Потрібні репозиторії та сутності для різних баз даних ---
     // --- Потрібна повна конфігурація JTA та XA DataSources/Resource Managers ---
}
```
