import { Outlet, createRootRoute } from '@tanstack/react-router'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'
import { TanStackDevtools } from '@tanstack/react-devtools'

import { AppLayout } from '../components/AppLayout'

import ConvexProvider from '../integrations/convex/provider'

export const Route = createRootRoute({
  component: () => (
    <>
      <ConvexProvider>
        <AppLayout>
          <Outlet />
        </AppLayout>
        <TanStackDevtools
          config={{
            position: 'bottom-right',
          }}
          plugins={[
            {
              name: 'Tanstack Router',
              render: <TanStackRouterDevtoolsPanel />,
            },
          ]}
        />
      </ConvexProvider>
    </>
  ),
})
