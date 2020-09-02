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
  },
  people () {
    return [
      this.person(),
      this.person()
    ]
  }
}

export const validCode = `
  {
    name
    age
    matches: [
      person
      ...people
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