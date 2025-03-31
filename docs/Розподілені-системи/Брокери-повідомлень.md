
# RabbitMQ

## Exchange

Exchange – це гейтвей, куди надсилаються повідомлення. Він визначає, в яку чергу доставити повідомлення або чи буде воно відкинуто. Основні типи:
- **Direct** – надсилає повідомлення в чергу за routing key.
- **Fanout** – ігнорує routing key і надсилає повідомлення в усі прив'язані черги.
- **Topic** – надсилає повідомлення в чергу, якщо ключ відповідає заданому виразу (наприклад, `#` – 0+ слів, `*` – 1 слово).
- **Headers** – використовує заголовки замість routing keys (*x-match*: "any" або "all" за замовчуванням).

Властивості exchange:
- **Name** – назва гейтвею.
- **Durability** – при увімкненні exchange буде збережено після перезапуску.
- **Auto-Delete** – автоматичне видалення, якщо немає прив'язаних черг.
- Опціональні аргументи.

## Queue

Властивості черги:
- **Name** – назва (якщо не вказано, генерується автоматично).
- **Durability** – забезпечує збереження черги.
- **Exclusive** – черга використовується лише одним з'єднанням.
- **Auto-delete** – автоматичне видалення при відсутності споживачів.
- Опціональні аргументи.

*Приклад програмного створення черги:*

```java
Map<String, Object> queueArguments = new HashMap<>();
queueArguments.put("x-message-ttl", 60000);
queueArguments.put("x-max-priority", 10);

channel.queueDeclare("orders-queue", true, false, false, queueArguments);

// Бінд черги до exchange з routing key
channel.queueBind("orders-queue", "orders-direct-exchange", "orders-routing-key");
```