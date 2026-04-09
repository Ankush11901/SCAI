'use client'

import { ArticleType } from '@/data/article-types'
import { ComponentDefinition } from '@/data/components'

interface MatrixTableProps {
  articleTypes: ArticleType[]
  components: ComponentDefinition[]
}

/**
 * MatrixTable
 * Component requirement matrix for all article types
 */
export default function MatrixTable({ articleTypes, components }: MatrixTableProps) {
  // Get status for a component in an article type
  const getStatus = (component: ComponentDefinition, articleType: ArticleType): 'required' | 'optional' | 'na' => {
    // Universal components
    if (component.type === 'universal') {
      return component.required ? 'required' : 'optional'
    }
    
    // Unique components - check if applicable
    if (!component.articleTypes?.includes(articleType.id)) {
      return 'na'
    }
    
    return component.required ? 'required' : 'optional'
  }

  return (
    <div className="bg-scai-card border border-scai-border rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-scai-surface">
              <th className="sticky left-0 bg-scai-surface px-4 py-3 text-left text-sm font-semibold border-b border-r border-scai-border min-w-[200px]">
                Component
              </th>
              {articleTypes.map((type) => (
                <th
                  key={type.id}
                  className="px-4 py-3 text-center text-sm font-semibold border-b border-scai-border min-w-[100px]"
                >
                  {type.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {/* Universal Components Section */}
            <tr className="bg-scai-input/50">
              <td
                colSpan={articleTypes.length + 1}
                className="px-4 py-2 text-xs font-medium text-scai-text-muted uppercase tracking-wider border-b border-scai-border"
              >
                Universal Components
              </td>
            </tr>
            {components
              .filter((c) => c.type === 'universal')
              .map((component) => (
                <tr key={component.id} className="hover:bg-scai-surface/50 transition-colors">
                  <td className="sticky left-0 bg-scai-card px-4 py-3 border-b border-r border-scai-border">
                    <div className="font-medium text-sm">{component.name}</div>
                    <div className="text-xs text-scai-text-muted mt-0.5">{component.id}</div>
                  </td>
                  {articleTypes.map((type) => {
                    const status = getStatus(component, type)
                    return (
                      <td key={type.id} className="px-4 py-3 text-center border-b border-scai-border">
                        <StatusIndicator status={status} />
                      </td>
                    )
                  })}
                </tr>
              ))}

            {/* Unique Components Section */}
            <tr className="bg-scai-input/50">
              <td
                colSpan={articleTypes.length + 1}
                className="px-4 py-2 text-xs font-medium text-scai-text-muted uppercase tracking-wider border-b border-scai-border"
              >
                Unique Components
              </td>
            </tr>
            {components
              .filter((c) => c.type === 'unique')
              .map((component) => (
                <tr key={component.id} className="hover:bg-scai-surface/50 transition-colors">
                  <td className="sticky left-0 bg-scai-card px-4 py-3 border-b border-r border-scai-border">
                    <div className="font-medium text-sm">{component.name}</div>
                    <div className="text-xs text-scai-text-muted mt-0.5">{component.id}</div>
                  </td>
                  {articleTypes.map((type) => {
                    const status = getStatus(component, type)
                    return (
                      <td key={type.id} className="px-4 py-3 text-center border-b border-scai-border">
                        <StatusIndicator status={status} />
                      </td>
                    )
                  })}
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function StatusIndicator({ status }: { status: 'required' | 'optional' | 'na' }) {
  if (status === 'required') {
    return (
      <div className="flex justify-center">
        <span className="w-3 h-3 rounded-full bg-scai-brand1 shadow-[0_0_8px_rgba(64,237,195,0.6)]" />
      </div>
    )
  }

  if (status === 'optional') {
    return (
      <div className="flex justify-center">
        <span className="w-3 h-3 rounded-full bg-scai-input border border-scai-border" />
      </div>
    )
  }

  return (
    <div className="flex justify-center">
      <span className="w-3 h-3 rounded-full border border-scai-border-dim" />
    </div>
  )
}

