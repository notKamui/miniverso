import { createFileRoute } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import z from 'zod'
import { tryAsync } from '@/lib/utils/try'
import { validate } from '@/lib/utils/validate'

const $a = createServerFn()
  .inputValidator(validate(z.object({ a: z.uuid() })))
  .handler(({ data: { a } }) => `hello ${a}`)

export const Route = createFileRoute('/test')({
  loader: async () => {
    // const [e, a] = await tryAsync($a({ data: { a: '' } }))
    // console.log('e,a', e, a)
    console.log(await $a({ data: { a: '' } }))
  },
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/test"!</div>
}
