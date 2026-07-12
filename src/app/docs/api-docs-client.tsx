'use client'

import dynamic from 'next/dynamic'
import 'swagger-ui-react/swagger-ui.css'

const SwaggerUI = dynamic(() => import('swagger-ui-react'), { ssr: false })

export default function ApiDocsClient() {
  return (
    <div className="mx-auto max-w-5xl px-2 py-8">
      <SwaggerUI url="/api/openapi.json" docExpansion="list" />
    </div>
  )
}
