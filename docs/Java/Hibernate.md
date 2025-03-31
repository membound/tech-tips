
# Hibernate

## Основні методи

- **`session.get()` vs `session.load()`**  
  `get()` негайно завантажує сутність та повертає `null`, якщо її не знайдено;  
  `load()` повертає проксі та генерує виключення, якщо сутність відсутня.
  
- **`session.save()` vs `session.persist()`**  
  `save()` повертає згенерований ідентифікатор і може використовуватись поза транзакцією;  
  `persist()` використовується лише в межах транзакції.
  
- **`session.update()` vs `session.merge()`**  
  `update()` повторно приєднує відключену сутність до сесії;  
  `merge()` копіює стан сутності в поточну сесію, вирішуючи конфлікти.
  
- **`save()` vs `saveOrUpdate()`**  
  `save()` вставляє нову сутність,  
  `saveOrUpdate()` вставляє або оновлює залежно від наявності сутності.
  
- **`getCurrentSession()` vs `openSession()`**  
  `getCurrentSession()` повертає сесію, прив'язану до поточного контексту (наприклад, транзакції);  
  `openSession()` завжди створює нову сесію, що потребує ручного управління.

## Стан об'єкта в Hibernate

1. **Transient**: об'єкт не пов'язаний із сесією Hibernate і не зберігається в БД.
2. **Persistent**: об'єкт пов'язаний із сесією та синхронізовано з БД.
3. **Detached**: об'єкт, який раніше був persistent, але більше не прив'язаний до активної сесії.

## Анотації Hibernate

1. **@Generated** – позначає метод або властивість, значення якої генерується БД.
   ```java
   @Generated(value = GenerationTime.ALWAYS)
   @Column(columnDefinition = "AS CONCAT(COALESCE(firstName, ''), COALESCE(' ' + lastName, ''))")
   private String fullName;
   ```
2. **@Formula** – визначає SQL-фрагмент для обчислюваної властивості.
   ```java
   @Formula("(select avg(o.amount) from orders o where o.customer_id = id)")
   private Double averageOrderAmount;
   ```
3. **@NaturalId** – позначає властивість як унікальний бізнес-ключ.
   ```java
   @NaturalId
   private String email;
   ```
4. **@BatchSize** – контролює кількість записів, завантажуваних у партії.
   ```java
   @BatchSize(size = 10)
   private Set<Order> orders;
   ```
5. **@Type** – визначає користувацький тип мапінгу.
   ```java
   @Type(type = "json")
   private String jsonData;
   ```
6. **@LazyCollection** – регулює ліниве завантаження колекцій.
   ```java
   @LazyCollection(LazyCollectionOption.EXTRA)
   private Set<OrderItem> items;
   ```
7. **@Immutable** – позначає сутність або колекцію як тільки для читання.
   ```java
   @Immutable
   private List<Order> orders;
   ```
8. **@DynamicInsert** та **@DynamicUpdate** – генерують SQL динамічно.
   ```java
   @DynamicInsert
   @DynamicUpdate
   public class Order {}
   ```
9. **@OptimisticLocking** – налаштовує стратегію оптимістичного блокування.
   ```java
   @OptimisticLocking(type = OptimisticLockType.ALL)
   public class Order {}
   ```
10. **@Any** та **@AnyMetaDef** – для мапінгу асоціацій різних типів сутностей.
    ```java
    @Any(metaColumn = @Column(name = "ITEM_TYPE"))
    @AnyMetaDef(idType = "long", metaType = "string",
       metaValues = {
           @MetaValue(targetEntity = Book.class, value = "B"),
           @MetaValue(targetEntity = VHS.class, value = "V"),
       })
    @JoinColumn(name="ITEM_ID")
    private Object item;
    ```
11. **@CollectionId** – дозволяє визначити ідентифікатор для кожного елемента колекції.
    ```java
    @CollectionId(columns = @Column(name = "id"), type = @Type(type = "long"), generator = "sequence")
    private Set<Address> addresses;
    ```
12. **@SortComparator** та **@SortNatural** – задають сортування колекції за допомогою компаратора.
    ```java
    @SortComparator(OrderComparator.class)
    private SortedSet<Order> orders;
    ```
13. **@Cache** – використовується для другого рівня кешування.  
    > .usage – READ_ONLY/NONSTRICT_READ_WRITE/READ_WRITE/TRANSACTIONAL  
    > .region – рядок для визначення регіону кешу
    ```java
    @Entity
    @Cache(usage = CacheConcurrencyStrategy.READ_WRITE)
    public class Product {}
    ```