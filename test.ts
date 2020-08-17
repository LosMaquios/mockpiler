import mock, { parseMock } from './src/index'

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

console.log(
  JSON.stringify(parseMock(`
    {
      q: [
        (356) {
          ab
          c
          d
          e
        }

        (55) {
          b
        }

        (2) {

        }
      ]
    }
  `))
)