# Породжувальні (Creational)

## 1. Фабричний метод (Factory Method)
**Ідея**: Делегує створення об'єктів підкласам. Базовий клас визначає метод-фабрику, який викликають для отримання продукту, а підкласи вирішують, який конкретний об'єкт створювати.

```java
abstract class Creator {
    abstract Product createProduct();
}
class ConcreteCreator extends Creator {
    Product createProduct() { return new ConcreteProduct(); }
}
```

## 2. Абстрактна фабрика (Abstract Factory)
**Ідея**: Дозволяє створювати сімейство взаємопов'язаних продуктів (наприклад, різні GUI-елементи) без прив'язки до конкретних класів.

```java
interface GUIFactory {
    Button createButton();
    Checkbox createCheckbox();
}
class WinFactory implements GUIFactory {
    public Button createButton() { return new WinButton(); }
    public Checkbox createCheckbox() { return new WinCheckbox(); }
}
```

## 3. Будівельник (Builder)
**Ідея**: Поетапно конструює складний об'єкт, розділяючи процес побудови від остаточного представлення.

```java
class Person {
    private String name;
    private int age;
    // ...
    static class Builder {
        private String name;
        private int age;
        Builder setName(String n) { this.name = n; return this; }
        Builder setAge(int a) { this.age = a; return this; }
        Person build() {
            Person p = new Person();
            p.name = name;
            p.age = age;
            return p;
        }
    }
}
```

## 4. Прототип (Prototype)
**Ідея**: Створює новий об'єкт копіюванням існуючого (прототипу), не вдаючись до `new`.

```java
class Shape implements Cloneable {
    public Shape clone() throws CloneNotSupportedException {
        return (Shape) super.clone();
    }
}
```

## 5. Одинак (Singleton)
**Ідея**: Забезпечує існування лише одного екземпляра класу та глобальну точку доступу до нього.

```java
class Singleton {
    private static final Singleton INSTANCE = new Singleton();
    private Singleton() {}
    public static Singleton getInstance() {
        return INSTANCE;
    }
}
```

---

# Структурні (Structural)

## 1. Адаптер (Adapter)
**Ідея**: Дозволяє об'єктам із несумісними інтерфейсами працювати разом, обгортаючи один інтерфейс в інший.

```java
InputStream in = new FileInputStream("data.bin");
Reader reader = new InputStreamReader(in, StandardCharsets.UTF_8);
```

## 2. Міст (Bridge)
**Ідея**: Розділяє абстракцію і реалізацію, щоб вони могли змінюватися незалежно.

```java
interface Device { void turnOn(); }
class Radio implements Device {
    public void turnOn() { System.out.println("Radio on"); }
}
class RemoteControl {
    protected Device device;
    RemoteControl(Device device) { this.device = device; }
    void pressPower() { device.turnOn(); }
}
```

## 3. Компонувальник (Composite)
**Ідея**: Дає змогу групувати об'єкти у древоподібні структури та працювати з ними як з одним об'єктом.

```java
interface Graphic { void draw(); }
class Line implements Graphic {
    public void draw() { System.out.println("Line"); }
}
class Picture implements Graphic {
    private List<Graphic> children = new ArrayList<>();
    public void draw() { children.forEach(Graphic::draw); }
    void add(Graphic g) { children.add(g); }
}
```

## 4. Декоратор (Decorator)
**Ідея**: Динамічно додає об'єктам нові обов'язки, обгортаючи їх в інші об'єкти з однаковим інтерфейсом.

```java
InputStream fileStream = new FileInputStream("data.txt");
InputStream buffered = new BufferedInputStream(fileStream);
```

## 5. Фасад (Facade)
**Ідея**: Надає спрощений інтерфейс до складної системи, викликаючи її частини всередині себе.

```java
class CPU { void boot() {} }
class ComputerFacade {
    private CPU cpu = new CPU();
    public void start() { cpu.boot(); }
}
```

## 6. Легковаговик (Flyweight)
**Ідея**: Зменшує використання пам'яті шляхом спільного використання загального (незмінного) стану багатьма об'єктами.

```java
Integer x = Integer.valueOf(100);
Integer y = Integer.valueOf(100);
System.out.println(x == y); // true (кешовані об'єкти)
```

## 7. Замісник (Proxy)
**Ідея**: Перехоплює та контролює доступ до реального об'єкта, маючи з ним однаковий інтерфейс.

```java
class RealService implements Service {
    public void request() { System.out.println("RealService"); }
}
class ProxyService implements Service {
    private RealService real;
    public void request() {
        if (real == null) real = new RealService();
        real.request();
    }
}
```

---

# Поведінкові (Behavioral)

## 1. Ланцюг відповідальності (Chain of Responsibility)
**Ідея**: Передає запит уздовж ланцюжка об'єктів, поки якийсь із них не обробить його.

```java
abstract class Handler {
    protected Handler next;
    Handler setNext(Handler n) { next = n; return n; }
    void handle(int value) { if (next != null) next.handle(value); }
}
```

## 2. Команда (Command)
**Ідея**: Інкапсулює запит у вигляді об'єкта, даючи змогу відкладати виконання, логувати чи відміняти операції.

```java
interface Command { void execute(); }
class PrintCommand implements Command {
    private String msg;
    PrintCommand(String msg) { this.msg = msg; }
    public void execute() { System.out.println(msg); }
}
```

## 3. Ітератор (Iterator)
**Ідея**: Дає уніфікований спосіб обходу елементів колекції без розкриття її внутрішньої структури.

```java
List<String> list = List.of("Alice", "Bob");
Iterator<String> it = list.iterator();
while (it.hasNext()) {
    System.out.println(it.next());
}
```

## 4. Посередник (Mediator)
**Ідея**: Централізує взаємодію між об'єктами, щоб вони не посилалися один на одного безпосередньо.

```java
class ChatRoom {
    void showMessage(String user, String msg) {
        System.out.println(user + ": " + msg);
    }
}
```

## 5. Знімок (Memento)
**Ідея**: Зберігає та відновлює внутрішній стан об'єкта, не розкриваючи деталей реалізації.

```java
class Editor {
    String text;
    EditorState save() { return new EditorState(text); }
    void restore(EditorState s) { text = s.text; }
}
class EditorState {
    String text;
    EditorState(String t) { text = t; }
}
```

## 6. Спостерігач (Observer)
**Ідея**: Один об'єкт сповіщає зареєстрованих слухачів про зміни свого стану (механізм «підписка/сповіщення»).

```java
class EventSource {
    private List<Observer> observers = new ArrayList<>();
    void subscribe(Observer o) { observers.add(o); }
    void notify(String event) {
        observers.forEach(o -> o.update(event));
    }
}
interface Observer { void update(String event); }
```

## 7. Стан (State)
**Ідея**: Дає змогу об'єкту змінювати поведінку при зміні внутрішнього стану, виділяючи кожен стан у окремий клас.

```java
interface State { void handle(Context c); }
class Context {
    State state;
    void request() { state.handle(this); }
}
class StateA implements State {
    public void handle(Context c) { c.state = new StateB(); }
}
```

## 8. Стратегія (Strategy)
**Ідея**: Декларує сімейство алгоритмів (стратегій), інкапсулює кожну у власний клас і робить взаємозамінними.

```java
List<Integer> numbers = Arrays.asList(5,2,9);
numbers.sort(Comparator.naturalOrder());
numbers.sort(Comparator.reverseOrder());
```

## 9. Шаблонний метод (Template Method)
**Ідея**: Визначає скелет алгоритму у базовому класі, а підкласи переозначають окремі кроки, не змінюючи структуру алгоритму.

```java
abstract class Game {
    final void play() {
        start();
        end();
    }
    abstract void start();
    abstract void end();
}
```

## 10. Відвідувач (Visitor)
**Ідея**: Додає операції до різнорідних об'єктів без зміни їхніх класів, використовуючи «подвійну диспетчеризацію».

```java
interface Shape { void accept(Visitor v); }
class Dot implements Shape {
    public void accept(Visitor v) { v.visitDot(this); }
}
interface Visitor {
    void visitDot(Dot d);
}
```
