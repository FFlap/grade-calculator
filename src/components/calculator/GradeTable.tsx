import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { GradeRow } from './GradeRow'
import type { GradeRow as GradeRowType, GradeType } from './types'

interface GradeTableProps {
  rows: GradeRowType[]
  gradeType: GradeType
  onUpdateRow: (id: string, field: keyof GradeRowType, value: string) => void
  onDeleteRow: (id: string) => void
  onAddRow: () => void
}

export function GradeTable({
  rows,
  gradeType,
  onUpdateRow,
  onDeleteRow,
  onAddRow,
}: GradeTableProps) {
  const getGradeColumnHeader = () => {
    switch (gradeType) {
      case 'percentage':
        return 'Grade (%)'
      case 'letters':
        return 'Grade'
      case 'points':
        return 'Points'
      default:
        return 'Grade'
    }
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="hidden sm:grid grid-cols-[1fr_150px_100px_100px_40px] gap-2 text-sm font-medium text-muted-foreground px-1">
        <span>Assignment (optional)</span>
        <span className="text-center">Date</span>
        <span className="text-center">{getGradeColumnHeader()}</span>
        <span className="text-center">Weight</span>
        <span></span>
      </div>

      {/* Rows */}
      <div className="space-y-2">
        {rows.map((row) => (
          <GradeRow
            key={row.id}
            row={row}
            gradeType={gradeType}
            onUpdate={onUpdateRow}
            onDelete={onDeleteRow}
            showDelete={rows.length > 1}
          />
        ))}
      </div>

      {/* Add Row Button */}
      <Button
        variant="outline"
        size="sm"
        onClick={onAddRow}
        className="w-full border-dashed border-border hover:border-primary hover:text-primary hover:bg-primary/5"
      >
        <Plus className="h-4 w-4 mr-2" />
        Add row
      </Button>
    </div>
  )
}
