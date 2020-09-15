import { createMockServer } from './lib/runtimes/node'

const context = {
  title: 'Server test',
  serverStatus: 200,
  name: 'John Doe',
  age () {
    return Math.floor(Math.random() * 100)
  }
}

const server = createMockServer({ context })
const serverPort = 3000

server
  .listen(
    serverPort, 
    () => console.log('Listening on port:', serverPort)
  )
