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
  const handleTimeChange = (pageIndex: number, dayIndex: number, punchIndex: number, newValue: string) => {
    const newData = JSON.parse(JSON.stringify(data))
    newData.pages[pageIndex].days[dayIndex].punches[punchIndex].time_hhmm = newValue
    onChange(newData)
  }

  return (
    <div className="flex flex-col space-y-12 h-[60vh] overflow-auto pb-8 pr-2">
      {data.pages.map((page: any, pageIndex: number) => {
        // Descobrir o máximo de batidas para criar colunas para esta página
        const maxPunches = Math.max(...page.days.map((d: any) => d.punches.length), 4) // Pelo menos 4 colunas (IN, OUT, IN, OUT)
        
        return (
          <div key={pageIndex} className="border border-slate-800 rounded-lg overflow-hidden flex-shrink-0">
            <div className="bg-slate-900 p-3 border-b border-slate-800 font-semibold flex justify-between items-center text-slate-300">
              <span>Cartão de Ponto</span>
              <span className="text-sm bg-slate-800 px-2 py-1 rounded">
                Período: {page.period_month_year || 'Não encontrado'}
              </span>
            </div>
            
            <Table>
              <TableHeader className="bg-slate-900/50">
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
                {page.days.map((day: any, dIdx: number) => (
                  <TableRow key={dIdx} className="border-slate-800 hover:bg-slate-800/50">
                    <TableCell className="font-medium text-slate-400 whitespace-nowrap border-r border-slate-800/50 bg-slate-900/20">
                      {day.date_raw}
                    </TableCell>
                    {Array.from({ length: maxPunches }).map((_, pIdx) => {
                      const punch = day.punches[pIdx]
                      return (
                        <TableCell key={pIdx} className="p-2 border-r border-slate-800/20 last:border-r-0">
                          {punch ? (
                            <div className="relative">
                              <Input
                                value={punch.time_hhmm}
                                onChange={e => handleTimeChange(pageIndex, dIdx, pIdx, e.target.value)}
                                className={`h-8 text-center bg-slate-900 border-slate-700 font-mono text-slate-300 ${punch.time_hhmm.includes('?') || punch.time_hhmm.includes(':?') || punch.time_hhmm.includes('?:') ? 'text-yellow-200 border-yellow-500/50 bg-yellow-950/20' : ''}`}
                              />
                              {(punch.time_hhmm.includes('?') || punch.time_hhmm.includes(':?') || punch.time_hhmm.includes('?:')) && (
                                <AlertCircle className="w-3 h-3 absolute left-1.5 top-2.5 text-yellow-500" />
                              )}
                            </div>
                          ) : (
                            <div className="h-8 bg-slate-900/50 border border-slate-800/50 rounded flex items-center justify-center text-slate-600">
                              -
                            </div>
                          )}
                        </TableCell>
                      )
                    })}
                  </TableRow>
                ))}
                {(!page.days || page.days.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={maxPunches + 1} className="text-center py-8 text-slate-500">
                      Nenhum registro de ponto encontrado
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )
      })}
    </div>
  )
}
