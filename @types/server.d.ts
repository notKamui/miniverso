declare module '*/dist/server/server.js' {
  const handler: {
    fetch: (request: Request, env?: any) => Promise<Response> | Response
  }
  export default handler
}
