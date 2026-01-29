import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { X } from 'lucide-react'
import type { GradeRow as GradeRowType, GradeType } from './types'

interface GradeRowProps {
  row: GradeRowType
  gradeType: GradeType
  onUpdate: (id: string, field: keyof GradeRowType, value: string) => void
  onDelete: (id: string) => void
  showDelete: boolean
}

export function GradeRow({
  row,
  gradeType,
  onUpdate,
  onDelete,
  showDelete,
}: GradeRowProps) {
  const getGradePlaceholder = () => {
    switch (gradeType) {
      case 'percentage':
        return '85'
      case 'letters':
        return 'A-'
      case 'points':
        return '85'
      default:
        return ''
    }
  }

  const getGradeInputType = () => {
    return gradeType === 'letters' ? 'text' : 'number'
  }

  return (
    <div className="grid grid-cols-[1fr_100px_100px_40px] gap-2 items-center group">
      <Input
        type="text"
        placeholder="e.g. Homework"
        value={row.assignment}
        onChange={(e) => onUpdate(row.id, 'assignment', e.target.value)}
        className="bg-input border-border"
      />
      <Input
        type={getGradeInputType()}
        placeholder={getGradePlaceholder()}
        value={row.grade}
        onChange={(e) => onUpdate(row.id, 'grade', e.target.value)}
        className="bg-input border-border text-center"
      />
      <Input
        type="number"
        placeholder="20"
        value={row.weight}
        onChange={(e) => onUpdate(row.id, 'weight', e.target.value)}
        className="bg-input border-border text-center"
      />
      <Button
        variant="ghost"
        size="icon"
        onClick={() => onDelete(row.id)}
        className={`h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-opacity ${
          showDelete ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
        }`}
        disabled={!showDelete}
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  )
}
