/// <reference types="vinxi/types/client" />

import { createRouter } from '@app/router'
import { StartClient } from '@tanstack/start'
import { hydrateRoot } from 'react-dom/client'

const router = createRouter()

hydrateRoot(document, <StartClient router={router} />)
