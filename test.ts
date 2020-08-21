import mock, { parse } from './src/index'
import { scan, TokenLocation } from './src/lexer'
import { generateCodeframe } from './src/codeframe'

const fruits = [
  'watermelon',
  'strawberry',
  'pineapple',
  'apple'
]

const context = {
  name: 'John Doe',
  randomAge () {
    return Math.floor(Math.random() * 100)
  },
  randomFruit () {
    return fruits[Math.floor(Math.random() * fruits.length)]
  }
}

console.log(
  mock(context)`
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
)

const tokens = scan(`
  [
    (2) {
      name
      age: randomAge
      favoriteFruits: [
        (3) 'random-Fruit'
      ]
    }
  ]
`)

console.log(
  generateCodeframe(tokens, 2)
)
