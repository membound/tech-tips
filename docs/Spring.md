
# Spring

## Transaction Propagation

1. **MANDATORY** – поточна транзакція (створення виключення, якщо її немає).
2. **NESTED** – вкладена транзакція; якщо існує поточна, використовується вона, інакше створюється нова.
3. **NEVER** – транзакції заборонені (виникає виключення, якщо транзакція існує).
4. **NOT_SUPPORTED** – транзакція відключається, якщо вона існує.
5. **REQUIRED** – використовується поточна транзакція або створюється нова, якщо її немає.
6. **REQUIRES_NEW** – створюється нова транзакція та призупиняється поточна.
7. **SUPPORTS** – використовується поточна транзакція або виконується без неї.

## Scope бінів

1. **Singleton** (`@Scope("singleton")`) – *Дефолтний для всіх бінів*: один на ApplicationContext.
2. **Prototype** (`@Scope("prototype")`) – кожного разу створюється новий бін.
3. **Request** (`@RequestScope`) – один бін на HTTP-запит.
4. **Session** (`@SessionScope`) – один бін на HTTP-сесію (у MVC).
5. **Application** (`@ApplicationScope`) – один бін для веб-сервера, прив'язаний до ServletContext.
6. **Websocket** (`@Scope(scopeName = "websocket", proxyMode = ScopedProxyMode.TARGET_CLASS)`) – існує протягом веб-сокет-сесії.

*Можна створювати власні скоупи, реалізуючи інтерфейс `Scope` та реєструючи його через `ApplicationContext.getBeanFactory().registerScope("name", scope)`.*

## Життєвий цикл Bean

1. Instantiate
2. Populate properties
3. BeanNameAware's `setBeanName()`
4. BeanFactoryAware's `setBeanFactory()`
5. Pre-initialization (BeanPostProcessors)
6. InitializingBean's `afterPropertiesSet()`
7. Виклик користувацького методу ініціалізації (`@PostConstruct`)
8. Post-initialization (BeanPostProcessors)
9. …
10. DisposableBean's `destroy()`
11. Виклик користувацького методу знищення (`@PreDestroy`)
