import { useState } from 'react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { AlertCircle } from 'lucide-react'

interface Punch {
  kind: string
  time_raw: string
  time_hhmm: string
}

interface Day {
  date_raw: string
  punches: Punch[]
}

interface CartaoPontoTableProps {
  data: { pages: { days: Day[] }[] }
  onChange: (newData: any) => void
}

export default function CartaoPontoTable({ data, onChange }: CartaoPontoTableProps) {
  // Trabalhamos com a primeira página para simplificar a visualização (ou juntamos todas)
  const allDays = data.pages.flatMap(p => p.days)

  const handleTimeChange = (dayIndex: number, punchIndex: number, newValue: string) => {
    const newData = JSON.parse(JSON.stringify(data))
    
    let currentGlobalIndex = 0
    for (let p = 0; p < newData.pages.length; p++) {
      for (let d = 0; d < newData.pages[p].days.length; d++) {
        if (currentGlobalIndex === dayIndex) {
           newData.pages[p].days[d].punches[punchIndex].time_hhmm = newValue
           onChange(newData)
           return
        }
        currentGlobalIndex++
      }
    }
  }

  // Descobrir o máximo de batidas para criar colunas
  const maxPunches = Math.max(...allDays.map(d => d.punches.length), 4) // Pelo menos 4 colunas (IN, OUT, IN, OUT)

  return (
    <div className="overflow-auto h-[60vh] border border-slate-800 rounded-lg">
      <Table>
        <TableHeader className="bg-slate-900 sticky top-0 z-10 shadow-sm">
          <TableRow className="hover:bg-transparent border-slate-800">
            <TableHead className="w-[120px] text-slate-300">Data</TableHead>
            {Array.from({ length: maxPunches }).map((_, i) => (
              <TableHead key={i} className="text-center text-slate-300">
                {i % 2 === 0 ? 'Entrada' : 'Saída'} {Math.floor(i/2) + 1}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {allDays.map((day, dIdx) => (
            <TableRow key={dIdx} className="border-slate-800 hover:bg-slate-800/50">
              <TableCell className="font-medium text-slate-300">
                {day.date_raw}
              </TableCell>
              {Array.from({ length: maxPunches }).map((_, pIdx) => {
                const punch = day.punches[pIdx]
                const hasDoubt = punch?.time_raw.includes('?')

                return (
                  <TableCell key={pIdx} className="p-1">
                    {punch ? (
                      <div className="relative">
                        <Input 
                          value={punch.time_hhmm}
                          onChange={(e) => handleTimeChange(dIdx, pIdx, e.target.value)}
                          className={`h-8 text-center text-sm border-slate-700 bg-slate-900 focus-visible:ring-1 focus-visible:ring-blue-500
                            ${hasDoubt ? 'border-yellow-500/50 text-yellow-200 bg-yellow-950/20' : ''}
                          `}
                        />
                        {hasDoubt && (
                          <div className="absolute right-2 top-2 text-yellow-500" title="Dúvida no OCR">
                             <AlertCircle className="w-4 h-4" />
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="h-8 bg-slate-900/30 rounded border border-dashed border-slate-800"></div>
                    )}
                  </TableCell>
                )
              })}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
