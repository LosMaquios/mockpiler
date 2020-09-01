export const validContext = {
  name: 'Test',
  age () {
    return 40
  },
  person () {
    return {
      name: this.name,
      age: this.age()
    }
  }
}

export const validCode = `
  {
    name
    age
    matches: [
      person
      (3) {
        name
        age
      }
    ]
  }
`

export const unknownTokenCode = `
  {
    test,
  }
`

export const invalidTokenCode = `
  {
    test]
  }
`
