import fake from '../src'

test('should compile with fake data', () => {
  const result: { name: string, locale: string, mustache: string } = fake`
    {
      name: findName
      locale
      mustache: 'Paragraph: {{lorem.paragraph}}'
    }
  ` as any

  expect(typeof result.mustache).toBe('string')
  expect(typeof result.name).toBe('string')
  expect(typeof result.locale).toBe('string')
})