Welcome to your new TanStack app!

# Getting Started

To run this application:

```bash
bun install
bunx --bun run start
```

# Building For Production

To build this application for production:

```bash
bunx --bun run build
```

## Testing

This project uses [Vitest](https://vitest.dev/) for testing. You can run the tests with:

```bash
bunx --bun run test
```

## Styling

This project uses [Tailwind CSS](https://tailwindcss.com/) for styling.

## Shadcn

Add components using the latest version of [Shadcn](https://ui.shadcn.com/).

```bash
bunx shadcn@latest add button
```

## Routing

This project uses [TanStack Router](https://tanstack.com/router). The initial setup is a file based router. Which means that the routes are managed as files in `src/routes`.

### Adding A Route

To add a new route to your application just add another a new file in the `./src/routes` directory.

TanStack will automatically generate the content of the route file for you.

Now that you have two routes you can use a `Link` component to navigate between them.

### Adding Links

To use SPA (Single Page Application) navigation you will need to import the `Link` component from `@tanstack/react-router`.

```tsx
import { Link } from "@tanstack/react-router";
```

Then anywhere in your JSX you can use it like so:

```tsx
<Link to="/about">About</Link>
```

This will create a link that will navigate to the `/about` route.

More information on the `Link` component can be found in the [Link documentation](https://tanstack.com/router/v1/docs/framework/react/api/router/linkComponent).

### Using A Layout

In the File Based Routing setup the layout is located in `src/routes/__root.tsx`. Anything you add to the root route will appear in all the routes. The route content will appear in the JSX where you use the `<Outlet />` component.

Here is an example layout that includes a header:

```tsx
import { Outlet, createRootRoute } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";

import { Link } from "@tanstack/react-router";

export const Route = createRootRoute({
  component: () => (
    <>
      <header>
        <nav>
          <Link to="/">Home</Link>
          <Link to="/about">About</Link>
        </nav>
      </header>
      <Outlet />
      <TanStackRouterDevtools />
    </>
  ),
});
```

The `<TanStackRouterDevtools />` component is not required so you can remove it if you don't want it in your layout.

More information on layouts can be found in the [Layouts documentation](https://tanstack.com/router/latest/docs/framework/react/guide/routing-concepts#layouts).

## Data Fetching

There are multiple ways to fetch data in your application. You can use TanStack Query to fetch data from a server. But you can also use the `loader` functionality built into TanStack Router to load the data for a route before it's rendered.

For example:

```tsx
const peopleRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/people",
  loader: async () => {
    const response = await fetch("https://swapi.dev/api/people");
    return response.json() as Promise<{
      results: {
        name: string;
      }[];
    }>;
  },
  component: () => {
    const data = peopleRoute.useLoaderData();
    return (
      <ul>
        {data.results.map((person) => (
          <li key={person.name}>{person.name}</li>
        ))}
      </ul>
    );
  },
});
```

Loaders simplify your data fetching logic dramatically. Check out more information in the [Loader documentation](https://tanstack.com/router/latest/docs/framework/react/guide/data-loading#loader-parameters).

### React-Query

React-Query is an excellent addition or alternative to route loading and integrating it into you application is a breeze.

First add your dependencies:

```bash
bun install @tanstack/react-query @tanstack/react-query-devtools
```

Next we'll need to create a query client and provider. We recommend putting those in `main.tsx`.

```tsx
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// ...

const queryClient = new QueryClient();

// ...

if (!rootElement.innerHTML) {
  const root = ReactDOM.createRoot(rootElement);

  root.render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
}
```

You can also add TanStack Query Devtools to the root route (optional).

```tsx
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";

const rootRoute = createRootRoute({
  component: () => (
    <>
      <Outlet />
      <ReactQueryDevtools buttonPosition="top-right" />
      <TanStackRouterDevtools />
    </>
  ),
});
```

Now you can use `useQuery` to fetch your data.

```tsx
import { useQuery } from "@tanstack/react-query";

import "./App.css";

function App() {
  const { data } = useQuery({
    queryKey: ["people"],
    queryFn: () =>
      fetch("https://swapi.dev/api/people")
        .then((res) => res.json())
        .then((data) => data.results as { name: string }[]),
    initialData: [],
  });

  return (
    <div>
      <ul>
        {data.map((person) => (
          <li key={person.name}>{person.name}</li>
        ))}
      </ul>
    </div>
  );
}

export default App;
```

You can find out everything you need to know on how to use React-Query in the [React-Query documentation](https://tanstack.com/query/latest/docs/framework/react/overview).

## State Management

Another common requirement for React applications is state management. There are many options for state management in React. TanStack Store provides a great starting point for your project.

First you need to add TanStack Store as a dependency:

```bash
bun install @tanstack/store
```

Now let's create a simple counter in the `src/App.tsx` file as a demonstration.

```tsx
import { useStore } from "@tanstack/react-store";
import { Store } from "@tanstack/store";
import "./App.css";

const countStore = new Store(0);

function App() {
  const count = useStore(countStore);
  return (
    <div>
      <button onClick={() => countStore.setState((n) => n + 1)}>
        Increment - {count}
      </button>
    </div>
  );
}

export default App;
```

One of the many nice features of TanStack Store is the ability to derive state from other state. That derived state will update when the base state updates.

Let's check this out by doubling the count using derived state.

```tsx
import { useStore } from "@tanstack/react-store";
import { Store, Derived } from "@tanstack/store";
import "./App.css";

const countStore = new Store(0);

const doubledStore = new Derived({
  fn: () => countStore.state * 2,
  deps: [countStore],
});
doubledStore.mount();

function App() {
  const count = useStore(countStore);
  const doubledCount = useStore(doubledStore);

  return (
    <div>
      <button onClick={() => countStore.setState((n) => n + 1)}>
        Increment - {count}
      </button>
      <div>Doubled - {doubledCount}</div>
    </div>
  );
}

export default App;
```

We use the `Derived` class to create a new store that is derived from another store. The `Derived` class has a `mount` method that will start the derived store updating.

Once we've created the derived store we can use it in the `App` component just like we would any other store using the `useStore` hook.

You can find out everything you need to know on how to use TanStack Store in the [TanStack Store documentation](https://tanstack.com/store/latest).

# Demo files

Files prefixed with `demo` can be safely deleted. They are there to provide a starting point for you to play around with the features you've installed.

# Learn More

You can learn more about all of the offerings from TanStack in the [TanStack documentation](https://tanstack.com).

## Environment Configuration

The production Bun server (`serve.ts`) supports several environment variables to control static asset preloading, caching, and optimization features.

### Core

- `PORT` (number, default: `3000`)
  Port the Bun server listens on.

- `DATABASE_URL` (string, required)
  Postgres connection string used for Drizzle migrations and runtime queries.

### Static Asset Preloading

The server can preload smaller static assets into memory for faster responses while serving larger or filtered assets directly from disk on-demand.

- `STATIC_PRELOAD_MAX_BYTES` (number, default: `5242880` / 5MB)
  Maximum file size (in bytes) eligible for in-memory preloading. Files larger than this are served on-demand.

- `STATIC_PRELOAD_INCLUDE` (string, optional)
  Comma-separated list of glob patterns (matched against file names, not full paths). If provided, ONLY matching files are considered for preloading.
  Example: `STATIC_PRELOAD_INCLUDE="*.js,*.css,*.woff2"`

- `STATIC_PRELOAD_EXCLUDE` (string, optional)
  Comma-separated list of glob patterns (matched against file names) to always exclude from preloading. Evaluated after includes.
  Example: `STATIC_PRELOAD_EXCLUDE="*.map,*.txt"`

- `STATIC_PRELOAD_VERBOSE` (boolean, default: `false`)
  When `true`, prints a detailed per-file report including why files were skipped.

### Optional Optimizations

- `STATIC_PRELOAD_ETAG` (boolean, default: `true`)
  When enabled, preloaded assets are served with an `ETag` header and conditional requests using `If-None-Match` can return `304 Not Modified`.

- `STATIC_PRELOAD_GZIP` (boolean, default: `true`)
  Pre-compresses eligible preloaded assets with gzip. Served automatically when the client includes `Accept-Encoding: gzip`.

- `STATIC_PRELOAD_GZIP_MIN_BYTES` (number, default: `1024`)
  Minimum uncompressed size (in bytes) for a file to be considered for precompression. Avoids wasting CPU on tiny files.

- `STATIC_PRELOAD_GZIP_TYPES` (string, default: `text/,application/javascript,application/json,application/xml,image/svg+xml`)
  Comma-separated list of MIME types or type prefixes ending with `/` that are eligible for gzip precompression. Example adds Markdown: `STATIC_PRELOAD_GZIP_TYPES="text/,application/javascript,application/json,application/xml,image/svg+xml,text/markdown"`.

### How It Works (Summary)

1. Files in `dist/client` are scanned using `Bun.Glob` with the composite include patterns (if any).
2. Each file is filtered by include/exclude lists.
3. If within `STATIC_PRELOAD_MAX_BYTES`, it's loaded into memory (and optionally gzipped + ETagged).
4. Larger or filtered files get lightweight on-demand route handlers that stream from disk.
5. Immutable caching headers (`max-age=31536000, immutable`) are applied to preloaded assets. On-demand assets use a shorter cache (`max-age=3600`).

### Quick Start Example

```bash
# Preload only JS/CSS/WOFF2 up to 2MB, enable verbose logging
PORT=3000 \
STATIC_PRELOAD_MAX_BYTES=2097152 \
STATIC_PRELOAD_INCLUDE="*.js,*.css,*.woff2" \
STATIC_PRELOAD_EXCLUDE="*.map" \
STATIC_PRELOAD_VERBOSE=true \
STATIC_PRELOAD_GZIP=true \
STATIC_PRELOAD_ETAG=true \
bun run serve.ts
```

See `.env.example` for an annotated list of available settings.
