declare module '*/dist/server/server.js' {
  const handler: {
    fetch: (request: Request) => Promise<Response> | Response
  }
  export default handler
}
