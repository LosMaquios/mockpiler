# MockPiler

  Generate mock data using a dead simple, intuitive, and structured language.

  **Status:** Currently, it's just an experiment (with bad-written code)

## Example

```ts
import mock from '@mockpiler/core'

const context = {
  name: 'John Doe',
  randomAge () {
    return Math.floor(Math.random() * 100)
  },
  randomFruit () {
    const fruits = [
      'watermelon',
      'strawberry',
      'pineapple',
      'apple'
    ]

    return fruits[Math.floor(Math.random() * fruits.length)]
  }
}

const people = mock(context)`
  [
    (2) {
      name
      age: randomAge
      favoriteFruits: [
        (3) randomFruit
      ]
    }
  ]
`

console.log(people)

/**
 * Example output:
 * 
 * [
 *   {
 *     name: 'John Doe',
 *     age: 33,
 *     favoriteFruits: [
 *       'watermelon',
 *       'pineapple',
 *       'apple'
 *     ]
 *   },
 *   {
 *     name: 'John Doe',
 *     age: 56,
 *     favoriteFruits: [
 *       'strawberry',
 *       'pineapple',
 *       'apple'
 *     ]
 *   }
 * ]
 */
```

## Roadmap / Ideas

  - [x] Implement a lexer for codeframes
  - [ ] Make an integration with libs like [Faker.js](https://github.com/marak/Faker.js/)
  - [ ] Support for spread operators `e.g. { ...spread }`
