::: warning
Work in progress!
:::

# React

## Загальні відомості

Звісно, я допоможу вам підготуватися до співбесіди з React, спираючись на ваші знання Vue 3. Ваш досвід з Vue 3 буде корисним, оскільки між цими фреймворками є багато спільного.

## Ключові подібності та відмінності між React та Vue 3

### Схожості:
- Обидва використовують віртуальний DOM.
- Обидва підтримують компонентну архітектуру.
- В обох є реактивність та система управління станом.
- Composition API у Vue 3 концептуально схожий на React Hooks.

### Відмінності:
- React використовує JSX, а Vue – шаблони (хоча Vue також підтримує JSX).
- У React оновлення стану відбувається асинхронно через `setState`, а у Vue реактивність більш «автоматична».
- React не має вбудованих директив, подібних до `v-if` або `v-for` у Vue.

## Основні концепції React

### 1. Компоненти

#### Функціональний компонент

```jsx
function Welcome(props) {
  return <h1>Привіт, {props.name}</h1>;
}
```

#### Класовий компонент (використовується рідше)

```jsx
class Welcome extends React.Component {
  render() {
    return <h1>Привіт, {this.props.name}</h1>;
  }
}
```

### 2. Хуки (аналог Composition API у Vue 3)

```jsx
import React, { useState, useEffect } from 'react';

function Counter() {
  // useState – управління станом (аналог ref у Vue 3)
  const [count, setCount] = useState(0);

  // useEffect – для побічних ефектів (аналог onMounted, watch у Vue 3)
  useEffect(() => {
    document.title = `Ви натиснули ${count} раз`;

    // Функція очистки (аналог onUnmounted)
    return () => {
      document.title = 'React App';
    };
  }, [count]); // Массив залежностей

  return (
    <div>
      <p>Ви натиснули {count} раз</p>
      <button onClick={() => setCount(count + 1)}>Натисни мене</button>
    </div>
  );
}
```

### 3. Основні хуки React та їх аналоги у Vue 3

- `useState` → `ref` / `reactive`
- `useEffect` → комбінація `onMounted`, `onUpdated`, `watch`
- `useContext` → `provide` / `inject`
- `useRef` → `ref` (але використовується по-різному)
- `useMemo` → `computed`
- `useCallback` → аналог кешування функцій

## Популярні питання на співбесіді з React

1. **В чому різниця між станом (state) і властивостями (props)?**  
   - `props` передаються від батьківського компонента, `state` управляється всередині компонента.  
   - `props` не можна змінювати, `state` змінюється через `setState` або `useState`.

2. **Поясніть життєвий цикл компонента в React.**  
   - У функціональних компонентах життєвий цикл замінюється хуками (наприклад, `useEffect`).  
   - Класичні фази: mounting, updating, unmounting.

3. **Що таке Virtual DOM і як він працює?**

4. **Що таке JSX?**  
   - Синтаксис, що дозволяє писати HTML-подібний код всередині JavaScript.

5. **Як працює Context у React?**  
   - Дозволяє передавати дані через дерево компонентів без «props drilling».

6. **Що таке Redux і коли його використовувати?**

7. **Як оптимізувати продуктивність React-додатків?**  
   - Використання `React.memo`, `useMemo`, `useCallback`, а також правильне застосування ключів (keys).